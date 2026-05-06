import React from 'react';
import type { GameState } from '../game/types';
import { WAVE_DEFS, ENEMY_DEFS, MAX_WAVES } from '../game/constants';

interface WavePreviewProps {
  state: GameState;
}

export function WavePreview({ state: gameState }: WavePreviewProps) {
  const nextWaveIdx = gameState.wave; // 0-indexed for WAVE_DEFS
  if (nextWaveIdx >= MAX_WAVES) return null;

  const nextWave = WAVE_DEFS[nextWaveIdx];
  const totalEnemies = nextWave.enemies.reduce((s, g) => s + g.count, 0);

  return (
    <div className="bg-dark-800 border-t border-cyber-blue/20 px-4 py-2.5 flex items-center gap-6 select-none">
      <div className="flex items-center gap-2 min-w-[90px]">
        <div className="w-1.5 h-3 bg-cyber-purple rounded-full" style={{ boxShadow: '0 0 6px #7c3aed' }} />
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
          Next: Wave {nextWaveIdx + 1}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-1 overflow-x-auto">
        {nextWave.enemies.map((group, i) => {
          const def = ENEMY_DEFS[group.type];
          return (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: def.color, boxShadow: `0 0 4px ${def.color}` }}
              />
              <span className="text-[11px] font-mono text-white/60 capitalize">{group.type}</span>
              <span className="text-[11px] font-mono text-white/30">×{group.count}</span>
              {i < nextWave.enemies.length - 1 && (
                <span className="text-white/15 mx-1">·</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/30 font-mono">Total:</span>
          <span className="text-[11px] font-bold font-mono text-white/70">{totalEnemies}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-[10px]">◆</span>
          <span className="text-[11px] font-bold font-mono text-yellow-300/70">+{nextWave.goldBonus}</span>
        </div>
      </div>
    </div>
  );
}
