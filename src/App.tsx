import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { GameState, TowerType } from './game/types';
import { createInitialState, placeTower, sellTower, upgradeTower, startWave } from './game/engine';
import { renderGame } from './game/renderer';
import { useGameLoop } from './hooks/useGameLoop';
import { CELL_SIZE, GRID_COLS, VIEWPORT_COLS, VIEWPORT_W, VIEWPORT_H, MAP_W } from './game/constants';
import { HUD } from './components/HUD';
import { TowerShop } from './components/TowerShop';
import { GameOverlay } from './components/GameOverlay';
import { WavePreview } from './components/WavePreview';

const MAX_CAM_X = MAP_W - VIEWPORT_W;
const PAN_ZONE = 60;   // px from edge that triggers auto-pan
const PAN_SPEED = 280; // px/s

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const [snapshot, setSnapshot] = useState<GameState>(stateRef.current);
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);

  // Camera pan via mouse edge proximity
  const mousePanRef = useRef(0); // -1 left, 0 none, 1 right

  // Throttle React re-renders
  const lastSnapshotRef = useRef(0);
  const setThrottledSnapshot = useCallback((s: GameState) => {
    const now = performance.now();
    if (now - lastSnapshotRef.current > 50) {
      lastSnapshotRef.current = now;
      setSnapshot({ ...s });
    }
  }, []);

  const renderFn = useCallback((ctx: CanvasRenderingContext2D, state: GameState, time: number) => {
    renderGame(ctx, state, hoveredCellRef.current, time);
  }, []);

  const { start, stop } = useGameLoop(stateRef, setThrottledSnapshot, canvasRef, renderFn);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  // Edge-pan ticker — runs separately from game loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      const dir = mousePanRef.current;
      if (dir !== 0) {
        const state = stateRef.current;
        const newCamX = Math.max(0, Math.min(MAX_CAM_X, state.cameraX + dir * PAN_SPEED * dt));
        if (newCamX !== state.cameraX) {
          stateRef.current = { ...state, cameraX: newCamX };
          // force render snapshot so UI mini-map updates
          setSnapshot({ ...stateRef.current });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mouse wheel scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const newCamX = Math.max(0, Math.min(MAX_CAM_X, stateRef.current.cameraX + delta * 1.2));
      stateRef.current = { ...stateRef.current, cameraX: newCamX };
      setSnapshot({ ...stateRef.current });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ---- Helpers ----

  const getWorldCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = VIEWPORT_W / rect.width;
    const scaleY = VIEWPORT_H / rect.height;
    const viewX = (e.clientX - rect.left) * scaleX;
    const viewY = (e.clientY - rect.top) * scaleY;
    const worldX = viewX + stateRef.current.cameraX;
    return {
      x: Math.floor(worldX / CELL_SIZE),
      y: Math.floor(viewY / CELL_SIZE),
    };
  }, []);

  // ---- Canvas Events ----

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getWorldCell(e);
    const state = stateRef.current;

    if (state.selectedTowerType && state.grid[y]?.[x] === 'empty') {
      stateRef.current = placeTower(state, x, y, state.selectedTowerType);
      setSnapshot({ ...stateRef.current });
      return;
    }

    const tower = state.towers.find(t => t.gridX === x && t.gridY === y);
    if (tower) {
      stateRef.current = { ...stateRef.current, selectedTowerId: tower.id, selectedTowerType: null };
      setSnapshot({ ...stateRef.current });
      return;
    }

    stateRef.current = { ...stateRef.current, selectedTowerId: null };
    setSnapshot({ ...stateRef.current });
  }, [getWorldCell]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getWorldCell(e);
    hoveredCellRef.current = { x, y };

    // Edge pan
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = VIEWPORT_W / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    if (localX < PAN_ZONE) mousePanRef.current = -1;
    else if (localX > VIEWPORT_W - PAN_ZONE) mousePanRef.current = 1;
    else mousePanRef.current = 0;
  }, [getWorldCell]);

  const handleMouseLeave = useCallback(() => {
    hoveredCellRef.current = null;
    mousePanRef.current = 0;
  }, []);

  // ---- Game actions ----

  const handleSelectTower = useCallback((type: TowerType | null) => {
    stateRef.current = { ...stateRef.current, selectedTowerType: type, selectedTowerId: null };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleUpgrade = useCallback((id: string) => {
    stateRef.current = upgradeTower(stateRef.current, id);
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleSell = useCallback((id: string) => {
    stateRef.current = sellTower(stateRef.current, id);
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleDeselect = useCallback(() => {
    stateRef.current = { ...stateRef.current, selectedTowerId: null, selectedTowerType: null };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleStartWave = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase === 'menu' || cur.phase === 'wave_complete' || cur.phase === 'playing') {
      stateRef.current = startWave({ ...cur, phase: cur.phase === 'menu' ? 'wave_complete' : cur.phase });
      setSnapshot({ ...stateRef.current });
    }
  }, []);

  const handlePause = useCallback(() => {
    const cur = stateRef.current.phase;
    stateRef.current = { ...stateRef.current, phase: cur === 'playing' ? 'paused' : 'playing' };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleSetSpeed = useCallback((speed: number) => {
    stateRef.current = { ...stateRef.current, gameSpeed: speed };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleStart = useCallback(() => {
    stateRef.current = { ...stateRef.current, phase: 'wave_complete' };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleRestart = useCallback(() => {
    stateRef.current = { ...createInitialState(), phase: 'wave_complete' };
    setSnapshot({ ...stateRef.current });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const TOWER_KEYS: Record<string, TowerType> = {
      '1': 'cannon', '2': 'laser', '3': 'frost', '4': 'tesla', '5': 'missile',
    };
    const onKey = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (state.phase === 'menu') handleStart();
        else if (state.phase === 'wave_complete') handleStartWave();
      }
      if (e.key === 'p' || e.key === 'P') {
        if (state.phase === 'playing' || state.phase === 'paused') handlePause();
      }
      if (e.key === 'Escape') {
        stateRef.current = { ...stateRef.current, selectedTowerType: null, selectedTowerId: null };
        setSnapshot({ ...stateRef.current });
      }
      // Arrow key / A/D pan
      if (e.key === 'ArrowRight' || e.key === 'd') {
        stateRef.current = { ...stateRef.current, cameraX: Math.min(MAX_CAM_X, stateRef.current.cameraX + CELL_SIZE * 3) };
        setSnapshot({ ...stateRef.current });
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        stateRef.current = { ...stateRef.current, cameraX: Math.max(0, stateRef.current.cameraX - CELL_SIZE * 3) };
        setSnapshot({ ...stateRef.current });
      }
      if (TOWER_KEYS[e.key] && state.phase !== 'game_over' && state.phase !== 'victory') {
        const type = TOWER_KEYS[e.key];
        stateRef.current = {
          ...stateRef.current,
          selectedTowerType: stateRef.current.selectedTowerType === type ? null : type,
          selectedTowerId: null,
        };
        setSnapshot({ ...stateRef.current });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleStart, handleStartWave, handlePause]);

  const isGameActive = snapshot.phase !== 'menu';

  // Mini-map scroll indicator
  const camPct = snapshot.cameraX / MAX_CAM_X;

  return (
    <div
      className="w-screen h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1220 0%, #050810 100%)' }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden border border-cyber-blue/20"
        style={{ boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 20px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Top HUD */}
        {isGameActive && (
          <HUD
            state={snapshot}
            onStartWave={handleStartWave}
            onPause={handlePause}
            onSetSpeed={handleSetSpeed}
          />
        )}

        {/* Main: canvas + shop */}
        <div className="flex">
          <div className="relative flex flex-col">
            <canvas
              ref={canvasRef}
              width={VIEWPORT_W}
              height={VIEWPORT_H}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onContextMenu={e => e.preventDefault()}
              className="block"
              style={{ cursor: snapshot.selectedTowerType ? 'crosshair' : 'default' }}
            />
            <GameOverlay
              state={snapshot}
              onStart={handleStart}
              onRestart={handleRestart}
              onStartWave={handleStartWave}
              onResume={handlePause}
            />

            {/* Scroll indicator bar */}
            {isGameActive && (
              <div className="h-1 bg-dark-700 relative">
                <div
                  className="absolute top-0 h-full bg-cyber-blue/50 rounded-full transition-all duration-75"
                  style={{
                    width: `${(VIEWPORT_COLS / GRID_COLS) * 100}%`,
                    left: `${camPct * (100 - (VIEWPORT_COLS / GRID_COLS) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Tower shop */}
          {isGameActive && (
            <TowerShop
              state={snapshot}
              onSelectTower={handleSelectTower}
              onUpgrade={handleUpgrade}
              onSell={handleSell}
              onDeselect={handleDeselect}
            />
          )}
        </div>

        {/* Wave preview */}
        {isGameActive && snapshot.phase !== 'game_over' && snapshot.phase !== 'victory' && (
          <WavePreview state={snapshot} />
        )}
      </div>
    </div>
  );
}
