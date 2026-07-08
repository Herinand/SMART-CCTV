import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Monitor, Wifi, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">CCTV Live</h1>
        <p className="text-gray-400 mt-2 text-sm">Turn any phone into a security camera</p>
      </div>

      {/* Room Code Section */}
      <div className="flex-1 px-6 flex flex-col">
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-5 border border-gray-700/50 mb-6">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">
            Room Code
          </label>
          <div className="flex gap-3">
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter or generate"
              className="bg-gray-900/80 border-gray-700 text-white text-center text-lg font-mono tracking-[0.3em] placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm h-12"
              maxLength={6}
            />
            <Button
              onClick={generateCode}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white h-12 px-4 shrink-0"
            >
              Generate
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3">Both devices must use the same room code</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-4 flex-1">
          <button
            onClick={() => roomCode && navigate(`/camera/${roomCode}`)}
            disabled={!roomCode}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-6 text-left transition-all hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold mb-1">Camera Mode</h2>
                <p className="text-sm text-gray-400">Use this phone as a security camera. Place it where you want to monitor.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 mt-1 transition-colors" />
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Wifi className="w-3 h-3" />
              <span>Streams video & audio</span>
            </div>
          </button>

          <button
            onClick={() => roomCode && navigate(`/monitor/${roomCode}`)}
            disabled={!roomCode}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-6 text-left transition-all hover:border-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold mb-1">Monitor Mode</h2>
                <p className="text-sm text-gray-400">Watch the live feed from your camera phone on this device.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-500/50 group-hover:text-blue-400 mt-1 transition-colors" />
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Monitor className="w-3 h-3" />
              <span>View, screenshot & fullscreen</span>
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="py-6 text-center">
          <p className="text-xs text-gray-600">Peer-to-peer connection · No cloud storage</p>
        </div>
      </div>
    </div>
  );
}