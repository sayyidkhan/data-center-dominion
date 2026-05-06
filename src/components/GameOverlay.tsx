import React from 'react';
import type { GameState } from '../game/types';
import { MAX_WAVES } from '../game/constants';

interface GameOverlayProps {
  state: GameState;
  onStart: () => void;
  onRestart: () => void;
  onStartWave: () => void;
  onResume: () => void;
}

export function GameOverlay({ state, onStart, onRestart, onStartWave, onResume }: GameOverlayProps) {
  if (state.phase === 'playing' || state.phase === 'wave_complete') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      {state.phase === 'menu' && (
        <MenuScreen onStart={onStart} />
      )}
      {state.phase === 'paused' && (
        <PauseScreen state={state} onResume={onResume} onRestart={onRestart} />
      )}
      {state.phase === 'game_over' && (
        <GameOverScreen state={state} onRestart={onRestart} />
      )}
      {state.phase === 'victory' && (
        <VictoryScreen state={state} onRestart={onRestart} />
      )}
    </div>
  );
}

function MenuScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="pointer-events-auto text-center flex flex-col items-center gap-6 p-8">
      {/* Scanline bg effect */}
      <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-px bg-cyber-blue/60" />
            <span className="text-[10px] text-cyber-blue/60 font-mono uppercase tracking-widest">2026 Edition</span>
            <div className="w-8 h-px bg-cyber-blue/60" />
          </div>
          <h1
            className="text-6xl font-black uppercase tracking-tight text-white"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2)',
            }}
          >
            TOWER
          </h1>
          <h1
            className="text-6xl font-black uppercase tracking-tight"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              color: '#00d4ff',
              textShadow: '0 0 40px rgba(0,212,255,0.8), 0 0 80px rgba(0,212,255,0.4)',
            }}
          >
            DOMINION
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-white/40 font-mono text-sm max-w-xs leading-relaxed">
          Build towers. Defend your base.<br />Survive {MAX_WAVES} waves of relentless enemies.
        </p>

        {/* How to play */}
        <div className="bg-dark-800/80 border border-cyber-blue/20 rounded-2xl p-4 max-w-sm w-full">
          <p className="text-[10px] text-cyber-blue/60 font-mono uppercase tracking-widest mb-3">Quick Guide</p>
          <div className="flex flex-col gap-2 text-left">
            {[
              ['1', 'Select a tower from the shop panel'],
              ['2', 'Click an empty grid cell to place it'],
              ['3', 'Press Start Wave or [Space] to begin'],
              ['4', 'Upgrade placed towers for more power'],
            ].map(([n, t]) => (
              <div key={n} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] text-cyber-blue font-bold font-mono">{n}</span>
                </div>
                <span className="text-[11px] text-white/60 font-mono">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          className="px-10 py-3.5 font-bold text-dark-900 rounded-xl text-lg font-mono uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #0084ff)',
            boxShadow: '0 0 30px rgba(0,212,255,0.4), 0 4px 20px rgba(0,0,0,0.3)',
            fontFamily: 'Orbitron, sans-serif',
          }}
        >
          Launch
        </button>

        <p className="text-white/20 text-[10px] font-mono">Press [Space] to start the first wave</p>
      </div>
    </div>
  );
}

function PauseScreen({ state, onResume, onRestart }: { state: GameState; onResume: () => void; onRestart: () => void }) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 bg-dark-800/90 border border-cyber-blue/30 rounded-3xl p-8 shadow-cyber">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Paused</h2>
        <div className="flex flex-col gap-2 text-center">
          <StatLine label="Wave" value={`${state.wave} / ${MAX_WAVES}`} />
          <StatLine label="Score" value={state.score.toLocaleString()} />
          <StatLine label="Kills" value={state.totalKills} />
          <StatLine label="Gold Earned" value={state.totalGoldEarned} />
        </div>
        <div className="flex gap-3">
          <button onClick={onResume} className="px-6 py-2.5 bg-cyber-blue/20 border border-cyber-blue/60 rounded-xl text-cyber-blue font-bold font-mono text-sm hover:bg-cyber-blue/30 transition-all">
            ▶ Resume
          </button>
          <button onClick={onRestart} className="px-6 py-2.5 bg-dark-700 border border-white/20 rounded-xl text-white/60 font-mono text-sm hover:text-white/80 transition-all">
            ↺ Restart
          </button>
        </div>
      </div>
    </div>
  );
}

function WaveCompleteScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  if (state.wave >= MAX_WAVES) return null;
  return (
    <div className="pointer-events-auto flex flex-col items-center">
      <div className="relative z-10 flex flex-col items-center gap-4 bg-dark-800/95 border border-cyber-green/40 rounded-2xl px-8 py-5 shadow-cyber-green">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-ping" />
          <h3 className="text-lg font-black text-cyber-green uppercase tracking-widest font-mono">Wave {state.wave} Clear!</h3>
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-ping" />
        </div>
        <p className="text-white/40 text-xs font-mono">Prepare for Wave {state.wave + 1}</p>
        <button
          onClick={onNext}
          className="px-8 py-2.5 bg-cyber-green/20 border border-cyber-green/60 rounded-xl text-cyber-green font-bold font-mono text-sm hover:bg-cyber-green/30 hover:shadow-cyber-green transition-all"
        >
          ▶ Next Wave
        </button>
      </div>
    </div>
  );
}

function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <div className="absolute inset-0 bg-dark-900/75 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 bg-dark-800/95 border border-red-500/40 rounded-3xl p-8" style={{ boxShadow: '0 0 40px rgba(255,68,68,0.2)' }}>
        <div className="text-5xl">💀</div>
        <h2 className="text-3xl font-black text-red-400 uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 20px rgba(255,68,68,0.5)' }}>
          Game Over
        </h2>
        <div className="flex flex-col gap-2 text-center">
          <StatLine label="Reached Wave" value={`${state.wave} / ${MAX_WAVES}`} />
          <StatLine label="Final Score" value={state.score.toLocaleString()} />
          <StatLine label="Total Kills" value={state.totalKills} />
          <StatLine label="Towers Built" value={state.towers.length} />
        </div>
        <button
          onClick={onRestart}
          className="px-8 py-3 font-bold rounded-xl font-mono uppercase tracking-widest text-dark-900 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #ff4444, #cc0000)', boxShadow: '0 0 20px rgba(255,68,68,0.3)' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function VictoryScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 bg-dark-800/95 border border-yellow-400/40 rounded-3xl p-8" style={{ boxShadow: '0 0 60px rgba(255,204,0,0.2)' }}>
        <div className="text-5xl animate-bounce">🏆</div>
        <h2 className="text-3xl font-black uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', color: '#ffcc00', textShadow: '0 0 30px rgba(255,204,0,0.6)' }}>
          Victory!
        </h2>
        <p className="text-white/50 text-sm font-mono">All {MAX_WAVES} waves defeated!</p>
        <div className="flex flex-col gap-2 text-center">
          <StatLine label="Final Score" value={state.score.toLocaleString()} />
          <StatLine label="Total Kills" value={state.totalKills} />
          <StatLine label="Gold Earned" value={state.totalGoldEarned} />
        </div>
        <button
          onClick={onRestart}
          className="px-8 py-3 font-bold rounded-xl font-mono uppercase tracking-widest text-dark-900 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #ffcc00, #ff9900)', boxShadow: '0 0 30px rgba(255,204,0,0.4)' }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-xs text-white/40 font-mono">{label}</span>
      <span className="text-sm font-bold text-white font-mono">{value}</span>
    </div>
  );
}
