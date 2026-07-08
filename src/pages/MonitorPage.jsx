import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Camera, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import useWebRTC from '@/hooks/useWebRTC';
import StatusBadge from '@/components/cctv/StatusBadge';
import MotionAlerts from '@/components/cctv/MotionAlerts';
import { useToast } from '@/components/ui/use-toast';

export default function MonitorPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const { toast } = useToast();

  const { connectionState, remoteStream, startAsMonitor, cleanup } = useWebRTC(roomCode, 'monitor');

  useEffect(() => {
    startAsMonitor();
    return () => { cleanup(); };
  }, []);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleScreenshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const link = document.createElement('a');
    link.download = `cctv-${roomCode}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast({ title: 'Screenshot saved', description: 'Image downloaded to your device' });
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.() || await el.webkitRequestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleReconnect = async () => {
    await cleanup();
    startAsMonitor();
  };

  const handleBack = async () => {
    await cleanup();
    navigate('/');
  };

  const isConnected = connectionState === 'connected';
  const isFailed = connectionState === 'failed' || connectionState === 'disconnected';

  return (
    <div ref={containerRef} className="min-h-screen bg-black flex flex-col relative">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="absolute inset-0 w-full h-full object-contain bg-gray-950"
      />

      {/* Waiting / Error Overlay */}
      {!isConnected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/90">
          {isFailed ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <VolumeX className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Connection Lost</h2>
              <p className="text-sm text-gray-400 mb-6 text-center px-8">
                Make sure the camera phone is active and using room code <span className="font-mono text-emerald-400">{roomCode}</span>
              </p>
              <button
                onClick={handleReconnect}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-6 py-3 text-white transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Reconnect
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 border-4 border-gray-700 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Waiting for Camera</h2>
              <p className="text-sm text-gray-400 text-center px-8">
                Open Camera mode on the other phone with room code
              </p>
              <span className="font-mono text-emerald-400 text-xl mt-2 tracking-[0.3em]">{roomCode}</span>
            </>
          )}
        </div>
      )}

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={handleBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <StatusBadge state={connectionState} />
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
          <span className="text-[10px] text-gray-300 font-mono tracking-wider">{roomCode}</span>
        </div>
      </div>

      {/* Timestamp */}
      {isConnected && (
        <div className="relative z-20 flex items-start justify-end px-4 pt-0">
          <LiveTimestamp />
        </div>
      )}

      {/* Motion Alerts */}
      {isConnected && <MotionAlerts roomCode={roomCode} isConnected={isConnected} />}

      <div className="flex-1" />

      {/* Bottom Controls */}
      <div className="relative z-20 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setMuted(prev => !prev)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              muted ? 'bg-red-500/80' : 'bg-white/15 backdrop-blur'
            }`}
          >
            {muted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={handleScreenshot}
            disabled={!isConnected}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center disabled:opacity-30"
          >
            <Camera className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
          >
            <Maximize className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveTimestamp() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
      <span className="text-[10px] font-mono text-red-400">
        ● REC {time.toLocaleTimeString()}
      </span>
    </div>
  );
}