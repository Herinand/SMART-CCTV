import { useRef, useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function useWebRTC(roomCode, role) {
  const pcRef = useRef(null);
  const [connectionState, setConnectionState] = useState('new');
  const [remoteStream, setRemoteStream] = useState(null);
  const localStreamRef = useRef(null);
  const processedMsgIds = useRef(new Set());
  const pollingRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await base44.entities.SignalingMessage.create({
          room_code: roomCode,
          type: 'ice-candidate',
          payload: JSON.stringify(event.candidate),
          sender_role: role,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [roomCode, role]);

  const startCamera = useCallback(async (facingMode = 'environment') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const switchCamera = useCallback(async (facingMode) => {
    const oldStream = localStreamRef.current;
    if (!oldStream) return null;

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });

    const pc = pcRef.current;
    if (pc) {
      const senders = pc.getSenders();
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      const videoSender = senders.find(s => s.track?.kind === 'video');
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
      if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
    }

    oldStream.getTracks().forEach(t => t.stop());
    localStreamRef.current = newStream;
    return newStream;
  }, []);

  const startAsCamera = useCallback(async () => {
    const stream = await startCamera('environment');
    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    await base44.entities.Room.filter({ code: roomCode }).then(async (rooms) => {
      if (rooms.length > 0) {
        await base44.entities.Room.update(rooms[0].id, { camera_active: true, status: 'waiting' });
      } else {
        await base44.entities.Room.create({ code: roomCode, camera_active: true, status: 'waiting' });
      }
    });

    // Poll for signaling messages from monitor
    pollingRef.current = setInterval(async () => {
      const messages = await base44.entities.SignalingMessage.filter({
        room_code: roomCode,
        sender_role: 'monitor',
      });

      for (const msg of messages) {
        if (processedMsgIds.current.has(msg.id)) continue;
        processedMsgIds.current.add(msg.id);

        const payload = JSON.parse(msg.payload);

        if (msg.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await base44.entities.SignalingMessage.create({
            room_code: roomCode,
            type: 'answer',
            payload: JSON.stringify(answer),
            sender_role: 'camera',
          });
        } else if (msg.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(payload));
        }
      }
    }, 1500);

    return stream;
  }, [roomCode, createPeerConnection, startCamera]);

  const startAsMonitor = useCallback(async () => {
    const pc = createPeerConnection();
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await base44.entities.SignalingMessage.create({
      room_code: roomCode,
      type: 'offer',
      payload: JSON.stringify(offer),
      sender_role: 'monitor',
    });

    // Poll for signaling messages from camera
    pollingRef.current = setInterval(async () => {
      const messages = await base44.entities.SignalingMessage.filter({
        room_code: roomCode,
        sender_role: 'camera',
      });

      for (const msg of messages) {
        if (processedMsgIds.current.has(msg.id)) continue;
        processedMsgIds.current.add(msg.id);

        const payload = JSON.parse(msg.payload);

        if (msg.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
        } else if (msg.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(payload));
        }
      }
    }, 1500);
  }, [roomCode, createPeerConnection]);

  const cleanup = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());

    // Clean up signaling messages for this room
    const msgs = await base44.entities.SignalingMessage.filter({ room_code: roomCode });
    for (const m of msgs) {
      await base44.entities.SignalingMessage.delete(m.id);
    }
  }, [roomCode]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    connectionState,
    remoteStream,
    localStreamRef,
    startAsCamera,
    startAsMonitor,
    switchCamera,
    cleanup,
  };
}