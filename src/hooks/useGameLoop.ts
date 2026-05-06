import { useRef, useCallback, useEffect } from 'react';
import type { GameState } from '../game/types';
import { tickGame } from '../game/engine';

export function useGameLoop(
  stateRef: React.MutableRefObject<GameState>,
  setStateSnapshot: (s: GameState) => void,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  renderFn: (ctx: CanvasRenderingContext2D, state: GameState, time: number) => void
) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const loop = useCallback((timestamp: number) => {
    const delta = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = timestamp;
    timeRef.current += delta / 1000;

    // Advance game logic
    const newState = tickGame(stateRef.current, delta);
    stateRef.current = newState;

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) renderFn(ctx, newState, timeRef.current);
    }

    // Update React state (throttled to avoid excessive re-renders)
    setStateSnapshot(newState);

    rafRef.current = requestAnimationFrame(loop);
  }, [renderFn, setStateSnapshot, stateRef, canvasRef]);

  const start = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return { start, stop, time: timeRef };
}
