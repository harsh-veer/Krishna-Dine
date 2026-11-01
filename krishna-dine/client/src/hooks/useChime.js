import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../services/storage';

/**
 * New-order sound generated with the Web Audio API (no audio file to load or break).
 * Browsers only allow audio after a user gesture, so the kitchen screen asks once to enable it.
 */
export function useChime() {
  const ctxRef = useRef(null);
  const [enabled, setEnabled] = useState(() => storage.get('kd_sound', true));
  const [unlocked, setUnlocked] = useState(false);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  }, []);

  const unlock = useCallback(async () => {
    const ctx = ensureCtx();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    setUnlocked(ctx.state === 'running');
    return ctx.state === 'running';
  }, [ensureCtx]);

  // Any tap unlocks audio. We remember whether audio was already running before this gesture,
  // so the first tap on the sound button means "enable", not "turn off".
  const runningBeforeGesture = useRef(false);
  useEffect(() => {
    const handler = () => {
      runningBeforeGesture.current = ctxRef.current?.state === 'running';
      unlock();
    };
    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('keydown', handler, true);
    };
  }, [unlock]);

  const play = useCallback(() => {
    if (!enabled) return;
    const ctx = ensureCtx();
    if (!ctx || ctx.state !== 'running') return;
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }, [enabled, ensureCtx]);

  // First tap only unlocks audio; later taps switch sound on and off.
  const toggle = useCallback(() => {
    if (enabled && !runningBeforeGesture.current) {
      runningBeforeGesture.current = true;
      unlock().then((running) => running && play());
      return;
    }
    setEnabled((e) => {
      storage.set('kd_sound', !e);
      return !e;
    });
    unlock();
  }, [enabled, unlock, play]);

  return { play, enabled, unlocked, unlock, toggle };
}
