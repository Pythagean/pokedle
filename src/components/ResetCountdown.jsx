import React, { useState, useEffect } from 'react';

export default function ResetCountdown({ active = false, resetHourUtc = 23 }) {
  const [msUntilReset, setMsUntilReset] = useState(null);
  const [nextResetLocalTime, setNextResetLocalTime] = useState('');
  const [nextResetLocalDate, setNextResetLocalDate] = useState('');

  useEffect(() => {
    function computeNextReset() {
      const now = new Date();
      let nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHourUtc, 0, 0));
      if (now.getTime() >= nextReset.getTime()) {
        nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, resetHourUtc, 0, 0));
      }
      return nextReset;
    }

    function update() {
      const next = computeNextReset();
      setMsUntilReset(next.getTime() - Date.now());
      try {
        setNextResetLocalTime(next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }));
        setNextResetLocalDate(next.toLocaleDateString());
      } catch (e) {
        setNextResetLocalTime('');
        setNextResetLocalDate('');
      }
    }

    if (!active) {
      setMsUntilReset(null);
      return;
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [active, resetHourUtc]);

  function formatMs(ms) {
    if (ms == null) return '';
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return (days > 0 ? `${days}d ` : '') + `${hh}:${mm}:${ss}`;
  }

  if (!active) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 12, fontSize: 13, color: '#444' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Next puzzle resets on {nextResetLocalDate ? `${nextResetLocalDate} ` : ''}at {nextResetLocalTime || '—'}
      </div>
      <div aria-live="polite">Time until reset: <span>{formatMs(msUntilReset)}</span></div>
    </div>
  );
}
