import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import type { GameState, TowerType } from './game/types';
import { commandHeroMove, createInitialState, placeTower, sellTower, upgradeTower, startWave } from './game/engine';
import { renderGame } from './game/renderer';
import { useGameLoop } from './hooks/useGameLoop';
import { CELL_SIZE, GRID_COLS, VIEWPORT_COLS, VIEWPORT_W, VIEWPORT_H, MAP_W, HUD_SLOT_H, FOOTER_H } from './game/constants';
import { HUD } from './components/HUD';
import { TowerShop } from './components/TowerShop';
import { GameOverlay } from './components/GameOverlay';

const MAX_CAM_X = MAP_W - VIEWPORT_W;
const PAN_ZONE = 60;   // px from edge that triggers auto-pan
const PAN_SPEED = 280; // px/s
const VIEWPORT_FIT_MARGIN = 28;

const CHROME_FRAME_STYLE = {
  boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 20px 60px rgba(0,0,0,0.6)',
} as const;

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

  const getWorldPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = VIEWPORT_W / rect.width;
    const scaleY = VIEWPORT_H / rect.height;
    const viewX = (e.clientX - rect.left) * scaleX;
    const viewY = (e.clientY - rect.top) * scaleY;
    return {
      x: viewX + stateRef.current.cameraX,
      y: viewY,
    };
  }, []);

  const getWorldCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getWorldPoint(e);
    return {
      x: Math.floor(point.x / CELL_SIZE),
      y: Math.floor(point.y / CELL_SIZE),
    };
  }, [getWorldPoint]);

  // ---- Canvas Events ----

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getWorldCell(e);
    const point = getWorldPoint(e);
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

    stateRef.current = commandHeroMove(stateRef.current, point.x, point.y);
    setSnapshot({ ...stateRef.current });
  }, [getWorldCell, getWorldPoint]);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getWorldPoint(e);
    stateRef.current = commandHeroMove(stateRef.current, point.x, point.y);
    setSnapshot({ ...stateRef.current });
  }, [getWorldPoint]);

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

  const handleOutsideSelectionClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const state = stateRef.current;
    if (!state.selectedTowerType && !state.selectedTowerId) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, canvas')) return;

    handleDeselect();
  }, [handleDeselect]);

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

  const gameChromeRef = useRef<HTMLDivElement>(null);
  const [chromeFit, setChromeFit] = useState<{ scale: number; boxW: number; boxH: number }>({
    scale: 1,
    boxW: 0,
    boxH: 0,
  });

  useLayoutEffect(() => {
    const el = gameChromeRef.current;
    if (!el) return;

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;

    const measure = () => {
      const w = Math.max(el.offsetWidth, Math.ceil(el.scrollWidth));
      const h = Math.max(el.offsetHeight, Math.ceil(el.scrollHeight));
      if (w <= 0 || h <= 0) return;

      const availW = (vv?.width ?? window.innerWidth) - VIEWPORT_FIT_MARGIN * 2;
      const availH = (vv?.height ?? window.innerHeight) - VIEWPORT_FIT_MARGIN * 2;

      const scale = Math.min(1, availW / w, availH / h);
      setChromeFit({ scale, boxW: w, boxH: h });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
    };
  }, []);

  // Mini-map scroll indicator
  const camPct = snapshot.cameraX / MAX_CAM_X;

  const fitScale = chromeFit.scale;
  const fitOuterStyle =
    chromeFit.boxW > 0 && chromeFit.boxH > 0
      ? {
          width: chromeFit.boxW * fitScale,
          height: chromeFit.boxH * fitScale,
        }
      : undefined;

  return (
    <div
      className="w-screen h-screen flex items-center justify-center overflow-hidden min-h-[100dvh]"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1220 0%, #050810 100%)' }}
    >
      <div
        className="flex-shrink-0 overflow-hidden rounded-2xl border border-cyber-blue/20 bg-dark-900"
        style={{ ...(fitOuterStyle ?? {}), ...CHROME_FRAME_STYLE }}
      >
        <div
          ref={gameChromeRef}
          className="flex w-max flex-shrink-0 flex-col overflow-hidden bg-dark-900"
          style={{
            minWidth: VIEWPORT_W,
            transform: fitScale !== 1 ? `scale(${fitScale})` : undefined,
            transformOrigin: 'top left',
          }}
        >
        {/* Same fixed shell on menu & in-game so scale-to-fit and footprint match */}
        <div
          className={`flex shrink-0 flex-col overflow-hidden border-b border-cyber-blue/20 ${
            isGameActive ? 'bg-dark-800' : 'bg-dark-900'
          }`}
          style={{ height: HUD_SLOT_H }}
          aria-hidden={!isGameActive}
        >
          {isGameActive ? (
            <HUD
              state={snapshot}
              onStartWave={handleStartWave}
              onPause={handlePause}
              onSetSpeed={handleSetSpeed}
            />
          ) : null}
        </div>

        {/* Main: canvas + shop */}
        <div
          className="flex items-stretch"
          style={{ height: VIEWPORT_H + 4 + FOOTER_H }}
          onClick={handleOutsideSelectionClick}
        >
          <div className="relative flex shrink-0 flex-col" style={{ width: VIEWPORT_W }}>
            {/* Isolate overlays to the grid only — inset-0 must not include the footer row */}
            <div className="relative shrink-0 overflow-hidden" style={{ width: VIEWPORT_W, height: VIEWPORT_H }}>
              <canvas
                ref={canvasRef}
                width={VIEWPORT_W}
                height={VIEWPORT_H}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleCanvasContextMenu}
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

            <div className="relative h-1 shrink-0 bg-dark-700">
              {isGameActive ? (
                <div
                  className="absolute top-0 h-full rounded-full bg-cyber-blue/50 transition-all duration-75"
                  style={{
                    width: `${(VIEWPORT_COLS / GRID_COLS) * 100}%`,
                    left: `${camPct * (100 - (VIEWPORT_COLS / GRID_COLS) * 100)}%`,
                  }}
                />
              ) : null}
            </div>

            <div
              className={`relative z-10 shrink-0 overflow-x-auto overflow-y-hidden border-t border-cyber-blue/20 p-3 [scrollbar-width:thin] ${
                isGameActive ? 'bg-dark-800' : 'bg-dark-900'
              }`}
              style={{ height: FOOTER_H }}
              aria-hidden={!isGameActive}
            >
              {isGameActive ? (
                <div className="flex h-full min-h-0 min-w-0 items-stretch gap-3">
                  <div className="flex h-full min-h-0 w-72 shrink-0 flex-col">
                    <HeroStatus state={snapshot} />
                  </div>
                  <TowerShop
                    state={snapshot}
                    onSelectTower={handleSelectTower}
                    onUpgrade={handleUpgrade}
                    onSell={handleSell}
                    onDeselect={handleDeselect}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function HeroStatus({ state }: { state: GameState }) {
  const hero = state.hero;
  const dps = Math.round(hero.damage * hero.fireRate);
  const rangeCells = (hero.range / CELL_SIZE).toFixed(1);
  const controlHint =
    'Left-click: move mecha · Right-click: path · Shoots creeps automatically in weapon range';

  return (
    <div
      className="flex h-full min-h-0 w-72 flex-col gap-1.5 overflow-hidden rounded-xl border border-cyber-blue/25 bg-dark-900/70 px-2.5 py-2 select-none"
      title={controlHint}
    >
      <div className="flex shrink-0 gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyber-blue/35 bg-cyber-blue/10">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <rect x="6" y="5" width="10" height="10" rx="2" fill="#1b3656" stroke="#5ecbff" strokeWidth="1.4" />
            <circle cx="12" cy="9" r="1.8" fill="#64ffda" />
            <path d="M16 10 H20" stroke="#f6c453" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 15 L6 19 M14 15 L16 19" stroke="#5ecbff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 leading-tight">
            <p className="truncate font-mono text-xs font-bold text-cyber-blue">Defense Mecha</p>
            <span
              className="shrink-0 rounded bg-dark-700/70 px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums text-white/70 ring-1 ring-white/10"
              title={`Kills: ${hero.kills}`}
            >
              K {hero.kills}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 whitespace-normal break-words font-mono text-[9px] leading-snug text-white/42">
            {hero.targetId ? 'Engaging a creep.' : 'Awaiting orders — click the map.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
        <span
          className={`rounded px-1.5 py-0 text-[8px] font-bold uppercase tracking-wide ${
            hero.targetId ? 'bg-cyber-green/14 text-cyber-green' : 'bg-white/[0.07] text-white/45'
          }`}
        >
          {hero.targetId ? 'Live' : 'Idle'}
        </span>
        <span className="text-[9px] text-white/44">
          DPS{' '}
          <span className="font-bold tabular-nums text-cyber-blue">{dps}</span>
        </span>
        <span className="text-[9px] text-white/32">·</span>
        <span className="text-[9px] text-white/44">
          Rng <span className="font-bold tabular-nums text-white/70">{rangeCells}c</span>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 [grid-template-rows:repeat(2,minmax(0,1fr))]">
        <HeroMiniStat label="Damage" value={hero.damage} />
        <HeroMiniStat label="Range" value={`${rangeCells}c`} />
        <HeroMiniStat label="Rate" value={`${hero.fireRate.toFixed(1)}/s`} />
        <HeroMiniStat label="Speed" value={hero.speed} />
      </div>
    </div>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-h-0 flex-col justify-center gap-px rounded-md border border-white/[0.08] bg-dark-700/85 px-2 py-1.5">
      <p className="font-mono text-[8px] uppercase tracking-wider text-white/38">{label}</p>
      <p className="truncate font-mono text-xs font-bold tabular-nums leading-none text-white/90">{value}</p>
    </div>
  );
}
