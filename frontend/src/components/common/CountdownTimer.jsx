import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

export const CountdownTimer = ({ initialSeconds = 300, onExpire, isCompact = false }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSeconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  const isUrgent = secondsLeft < 60;
  const isWarning = secondsLeft < 120;

  if (isCompact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-bold ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`}>
        <Timer className="w-3.5 h-3.5" />
        {formattedTime}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        isUrgent
          ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse-fast'
          : isWarning
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-lg ${isUrgent ? 'bg-rose-200' : isWarning ? 'bg-amber-200' : 'bg-emerald-200'}`}>
          {isUrgent ? <AlertTriangle className="w-5 h-5 text-rose-700" /> : <Timer className="w-5 h-5 text-emerald-800" />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Temporary Slot Lock</p>
          <p className="text-xs text-slate-500">
            {secondsLeft > 0 ? 'Slot held in Redis. Complete booking before timer expires.' : 'Reservation expired.'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-mono text-2xl font-black tracking-tight ${isUrgent ? 'text-rose-600' : 'text-emerald-700'}`}>
          {formattedTime}
        </div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</p>
      </div>
    </div>
  );
};
