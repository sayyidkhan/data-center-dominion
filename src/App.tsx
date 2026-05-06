import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { GameState, TowerType } from './game/types';
import { createInitialState, placeTower, sellTower, upgradeTower, startWave } from './game/engine';
import { renderGame } from './game/renderer';
import { useGameLoop } from './hooks/useGameLoop';
import { CELL_SIZE, GRID_COLS, GRID_ROWS } from './game/constants';
import { HUD } from './components/HUD';
import { TowerShop } from './components/TowerShop';
import { GameOverlay } from './components/GameOverlay';
import { WavePreview } from './components/WavePreview';

const CANVAS_W = CELL_SIZE * GRID_COLS;
const CANVAS_H = CELL_SIZE * GRID_ROWS;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const [snapshot, setSnapshot] = useState<GameState>(stateRef.current);
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);

  // Throttle React state updates to ~20 fps to avoid thrashing
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

  // --- Input Handlers ---

  const getGridCell = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);
    return { x, y };
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGridCell(e);
    const state = stateRef.current;

    if (state.selectedTowerType && state.grid[y]?.[x] === 'empty') {
      stateRef.current = placeTower(state, x, y, state.selectedTowerType);
      setSnapshot({ ...stateRef.current });
      return;
    }

    // Select placed tower
    const tower = state.towers.find(t => t.gridX === x && t.gridY === y);
    if (tower) {
      stateRef.current = {
        ...stateRef.current,
        selectedTowerId: tower.id,
        selectedTowerType: null,
      };
      setSnapshot({ ...stateRef.current });
      return;
    }

    // Deselect
    stateRef.current = {
      ...stateRef.current,
      selectedTowerId: null,
    };
    setSnapshot({ ...stateRef.current });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getGridCell(e);
    hoveredCellRef.current = cell;
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredCellRef.current = null;
  }, []);

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
    if (stateRef.current.phase === 'menu' || stateRef.current.phase === 'wave_complete' || stateRef.current.phase === 'playing') {
      stateRef.current = startWave({ ...stateRef.current, phase: stateRef.current.phase === 'menu' ? 'wave_complete' : stateRef.current.phase });
      setSnapshot({ ...stateRef.current });
    }
  }, []);

  const handlePause = useCallback(() => {
    const cur = stateRef.current.phase;
    stateRef.current = {
      ...stateRef.current,
      phase: cur === 'playing' ? 'paused' : 'playing',
    };
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
    stateRef.current = createInitialState();
    stateRef.current = { ...stateRef.current, phase: 'wave_complete' };
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
        if (state.phase === 'menu') {
          handleStart();
        } else if (state.phase === 'wave_complete') {
          handleStartWave();
        }
      }

      if (e.key === 'p' || e.key === 'P') {
        if (state.phase === 'playing' || state.phase === 'paused') handlePause();
      }

      if (e.key === 'Escape') {
        stateRef.current = { ...stateRef.current, selectedTowerType: null, selectedTowerId: null };
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

        {/* Main area: canvas + shop */}
        <div className="flex">
          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
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
          </div>

          {/* Right: Tower shop */}
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

        {/* Bottom: wave preview */}
        {isGameActive && snapshot.phase !== 'game_over' && snapshot.phase !== 'victory' && (
          <WavePreview state={snapshot} />
        )}
      </div>
    </div>
  );
}
