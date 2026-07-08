import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, X } from 'lucide-react';

export default function MotionAlerts({ roomCode, isConnected }) {
  const [alerts, setAlerts] = useState([]);
  const [bannerAlert, setBannerAlert] = useState(null);
  const seenIds = useRef(new Set());
  const intervalRef = useRef(null);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    intervalRef.current = setInterval(async () => {
      const unread = await base44.entities.MotionAlert.filter({
        room_code: roomCode,
        read: false,
      });

      const newAlerts = unread.filter(a => !seenIds.current.has(a.id));
      if (newAlerts.length > 0) {
        newAlerts.forEach(a => seenIds.current.add(a.id));
        setAlerts(prev => [...newAlerts.reverse(), ...prev].slice(0, 20));
        setBannerAlert(newAlerts[0]);

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 Motion Detected', {
            body: `Movement detected in room ${roomCode} (${Math.round(newAlerts[0].intensity)}% intensity)`,
            icon: '/favicon.ico',
          });
        }

        // Mark as read
        newAlerts.forEach(a => base44.entities.MotionAlert.update(a.id, { read: true }));
      }
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [isConnected, roomCode]);

  if (alerts.length === 0) return null;

  return (
    <>
      {/* Banner alert */}
      {bannerAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="bg-red-500/90 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Motion Detected!</p>
              <p className="text-xs text-white/80">{Math.round(bannerAlert.intensity)}% intensity</p>
            </div>
            <button onClick={() => setBannerAlert(null)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      <div className="relative z-20 px-4 pb-2">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-medium">{alerts.length} Alert{alerts.length !== 1 ? 's' : ''}</span>
            </div>
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                <Activity className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-xs text-gray-300">
                  {new Date(a.created_date).toLocaleTimeString()} · {Math.round(a.intensity)}%
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </>
  );
}