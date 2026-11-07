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

  const playRef = useRef(null);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMsg = (e) => { if (e.data && e.data.type === 'new-order') playRef.current?.(); };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);

  const play = useCallback(() => {
    if (!enabled) return;
    const ctx = ensureCtx();
    if (!ctx || ctx.state !== 'running') return;
    // Siren-style alarm: alternating high/low tones for about 3 seconds, clearly different from a normal notification.
    try { navigator.vibrate?.([500, 200, 500, 200, 500]); } catch { /* not supported */ }
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    for (let i = 0; i < 8; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 960 : 720;
      const t = ctx.currentTime + i * 0.38;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
      gain.gain.setValueAtTime(0.6, t + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.37);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }, [enabled, ensureCtx]);

  playRef.current = play;

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
