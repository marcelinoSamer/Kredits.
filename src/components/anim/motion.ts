// Motion vocabulary for the "Vault Ledger, live" UI. Three primitives are
// reused everywhere: rolling figures, drawn lines, and press response.
// Everything honours the OS reduce-motion setting.

import { useEffect, useRef, useState } from 'react';
import { Easing, useReducedMotion } from 'react-native-reanimated';

export const MOTION = {
  /** Press feedback, toggles. */
  quick: 180,
  /** Value settles: bars drawing, figures rolling. */
  settle: 720,
  /** The single orchestrated reveal on launch. */
  reveal: 900,
  easeOut: Easing.out(Easing.cubic),
} as const;

/** True unless the OS asks for reduced motion. */
export function useMotionEnabled(): boolean {
  return !useReducedMotion();
}

/** One-shot launch flag so the dashboard reveal plays once per app run. */
let launched = false;
export function consumeLaunchReveal(): boolean {
  if (launched) return false;
  launched = true;
  return true;
}

/**
 * Rolls a number toward `target` over `duration` ms using a cubic ease-out.
 * Animates on every change; pass `fromZero` to roll up from 0 on first mount.
 */
export function useCountUp(target: number, enabled: boolean, opts: { duration?: number; fromZero?: boolean } = {}): number {
  const duration = opts.duration ?? MOTION.settle;
  const prev = useRef(opts.fromZero ? 0 : target);
  const [value, setValue] = useState(prev.current);

  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (!enabled || from === to || !Number.isFinite(to)) {
      prev.current = to;
      setValue(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      prev.current = to;
    };
  }, [target, enabled, duration]);

  return value;
}
