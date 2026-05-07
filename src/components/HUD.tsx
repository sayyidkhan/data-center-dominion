import React from 'react';
import type { GameState } from '../game/types';
import { ENEMY_DEFS, MAX_WAVES, WAVE_DEFS } from '../game/constants';

interface HUDProps {
  state: GameState;
  onStartWave: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
}

export function HUD({ state, onStartWave, onPause, onSetSpeed }: HUDProps) {
  const wavePct = state.waveSpawned > 0
    ? ((state.waveSpawned / (state.enemiesInWave.length || 1)) * 100)
    : 0;
  const nextWaveIdx = Math.min(state.wave, MAX_WAVES - 1);
  const nextWave = WAVE_DEFS[nextWaveIdx];
  const totalEnemies = nextWave?.enemies.reduce((s, g) => s + g.count, 0) ?? 0;

  const livesPct = (state.lives / state.maxLives) * 100;
  const livesColor = livesPct > 60 ? '#00ff88' : livesPct > 30 ? '#ffcc00' : '#ff4444';

  return (
    <div className="flex h-full items-center justify-between px-4 py-2 bg-dark-800 select-none overflow-hidden">
      {/* Left: Stats */}
      <div className="flex items-center gap-6">
        {/* Lives */}
        <div className="flex flex-col gap-1 min-w-[80px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Lives</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono" style={{ color: livesColor }}>
              {state.lives}
            </span>
            <div className="w-20 h-1.5 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${livesPct}%`, background: livesColor, boxShadow: `0 0 6px ${livesColor}` }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-cyber-blue/10" />

        {/* Gold */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Gold</span>
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 text-base">◆</span>
            <span className="text-lg font-bold font-mono text-yellow-300">{state.gold}</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Score</span>
          <span className="text-lg font-bold font-mono text-cyber-blue">{state.score.toLocaleString()}</span>
        </div>

        {/* Kills */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Kills</span>
          <span className="text-lg font-bold font-mono text-cyber-purple">{state.totalKills}</span>
        </div>
      </div>

      {/* Center: Wave info */}
      <div className="min-w-[440px] max-w-[560px] rounded-xl border border-cyber-green/40 bg-cyber-green/10 px-4 py-2"
        style={{ boxShadow: '0 0 16px rgba(0,255,136,0.12)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${state.phase === 'playing' ? 'bg-cyber-green animate-pulse' : 'bg-cyber-green/70'}`} />
              <span className="text-xs font-black font-mono text-cyber-green uppercase tracking-widest">
                {state.phase === 'playing'
                  ? `Wave ${state.wave} Live`
                  : state.wave > 0 && state.phase === 'wave_complete'
                    ? `Wave ${state.wave} Clear`
                    : 'Ready'}
              </span>
            </div>

            {state.phase === 'playing' && state.waveSpawned > 0 ? (
              <div className="mt-1 w-48 h-1 bg-dark-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyber-blue rounded-full transition-all duration-200"
                  style={{ width: `${wavePct}%`, boxShadow: '0 0 6px #00d4ff' }}
                />
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-white/35 font-mono flex-shrink-0">
                  Next Wave {nextWaveIdx + 1}
                </span>
                {nextWave?.enemies.map(group => {
                  const def = ENEMY_DEFS[group.type];
                  return (
                    <div key={group.type} className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: def.color, boxShadow: `0 0 4px ${def.color}` }}
                      />
                      <span className="text-[10px] text-white/65 font-mono capitalize">{group.type}</span>
                      <span className="text-[10px] text-white/35 font-mono">x{group.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {nextWave && state.phase !== 'playing' && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] font-bold font-mono text-white/55">{totalEnemies} total</span>
              <span className="text-[10px] font-bold font-mono text-yellow-300/80">◆ +{nextWave.goldBonus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Speed controls */}
        <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1 border border-white/10">
          {[0.5, 1, 2, 3].map(speed => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2 py-1 text-xs font-mono rounded-md transition-all ${
                state.gameSpeed === speed
                  ? 'bg-cyber-blue text-dark-900 font-bold shadow-cyber'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {speed === 0.5 ? '½x' : `${speed}x`}
            </button>
          ))}
        </div>

        {/* Pause */}
        {state.phase === 'playing' && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition-all text-xs font-mono"
          >
            <span>⏸</span> Pause
          </button>
        )}
        {state.phase === 'paused' && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-blue/20 border border-cyber-blue/50 rounded-lg text-cyber-blue hover:bg-cyber-blue/30 transition-all text-xs font-mono animate-pulse"
          >
            <span>▶</span> Resume
          </button>
        )}

        {/* Start next wave */}
        {(state.phase === 'wave_complete' || (state.phase === 'playing' && state.wave === 0)) && (
          <button
            onClick={onStartWave}
            disabled={state.wave >= MAX_WAVES}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyber-green/20 border border-cyber-green/60 rounded-lg text-cyber-green font-bold font-mono text-sm hover:bg-cyber-green/30 hover:shadow-cyber-green transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state.wave === 0 ? '▶ Start' : `▶ Wave ${state.wave + 1}`}
          </button>
        )}
      </div>
    </div>
  );
}
