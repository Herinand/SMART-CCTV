import React from 'react';

const STATUS_MAP = {
  new: { label: 'Initializing', color: 'bg-yellow-500' },
  connecting: { label: 'Connecting', color: 'bg-yellow-500' },
  connected: { label: 'Live', color: 'bg-emerald-500' },
  disconnected: { label: 'Disconnected', color: 'bg-red-500' },
  failed: { label: 'Failed', color: 'bg-red-500' },
  closed: { label: 'Closed', color: 'bg-gray-500' },
};

export default function StatusBadge({ state }) {
  const info = STATUS_MAP[state] || STATUS_MAP.new;

  return (
    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
      <span className={`w-2 h-2 rounded-full ${info.color} ${state === 'connected' ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-white">{info.label}</span>
    </div>
  );
}