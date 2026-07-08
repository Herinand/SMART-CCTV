import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SwitchCamera, MicOff, Mic, VideoOff, Video, Radar } from 'lucide-react';
import useWebRTC from '@/hooks/useWebRTC';
import useMotionDetection from '@/hooks/useMotionDetection';
import StatusBadge from '@/components/cctv/StatusBadge';
import { base44 } from '@/api/base44Client';

export default function CameraPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [started, setStarted] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  const { connectionState, localStreamRef, startAsCamera, switchCamera, cleanup } = useWebRTC(roomCode, 'camera');

  const handleMotion = async (intensity) => {
    // Capture screenshot of current frame
    let screenshotUrl = null;
    const video = videoRef.current;
    if (video && video.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      screenshotUrl = canvas.toDataURL('image/jpeg', 0.5);
    }

    await base44.entities.MotionAlert.create({
      room_code: roomCode,
      intensity,
      screenshot_url: screenshotUrl,
      read: false,
    });
  };

  const { motionLevel } = useMotionDetection(videoRef, motionEnabled && started, handleMotion);

  useEffect(() => {
    let mounted = true;
    startAsCamera().then((stream) => {
      if (mounted && videoRef.current) {
        videoRef.current.srcObject = stream;
        setStarted(true);
      }
    });
    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const handleSwitchCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    const newStream = await switchCamera(newFacing);
    if (newStream && videoRef.current) {
      videoRef.current.srcObject = newStream;
      setFacingMode(newFacing);
    }
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setAudioEnabled(prev => !prev);
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setVideoEnabled(prev => !prev);
    }
  };

  const handleBack = async () => {
    await cleanup();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={handleBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <StatusBadge state={connectionState} />
        <div className="w-10" />
      </div>

      {/* Room Code Label */}
      <div className="relative z-10 flex-1 flex flex-col items-center gap-2 pt-2">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-300 font-mono tracking-widest">ROOM: {roomCode}</span>
        </div>
        {motionEnabled && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 w-48">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Motion</span>
              <span className="text-[10px] text-emerald-400 font-mono">{Math.round(motionLevel)}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  motionLevel > 15 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(motionLevel * 3, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {!started && (
          <div className="text-center mb-4">
            <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Starting camera...</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              audioEnabled ? 'bg-white/15 backdrop-blur' : 'bg-red-500/80'
            }`}
          >
            {audioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              videoEnabled ? 'bg-white/15 backdrop-blur' : 'bg-red-500/80'
            }`}
          >
            {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={handleSwitchCamera}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
          >
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => setMotionEnabled(prev => !prev)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              motionEnabled ? 'bg-emerald-500/80' : 'bg-white/15 backdrop-blur'
            }`}
          >
            <Radar className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}