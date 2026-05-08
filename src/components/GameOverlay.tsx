import React from 'react';
import type { GameState } from '../game/types';
import { formatCompactCount } from '../formatCompactCount';

interface GameOverlayProps {
  state: GameState;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
}

export function GameOverlay({ state, onStart, onRestart, onResume }: GameOverlayProps) {
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
      {/* Darken center — canvas menu backdrop stays sharp (no backdrop-blur on pixel canvas). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-dark-900/40 via-dark-900/70 to-dark-900/90" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-px bg-cyber-blue/60" />
            <span className="text-xs text-cyber-blue/60 font-mono uppercase tracking-widest">2026 Edition</span>
            <div className="w-8 h-px bg-cyber-blue/60" />
          </div>
          <h1
            className="text-6xl font-black uppercase tracking-tight text-white"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.2)',
            }}
          >
            DATA CENTER
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

        <p className="max-w-md text-base leading-relaxed text-white/45 font-mono">
          Choose a battle mode. Single player runs locally against an AI opponent.
        </p>

        <div className="grid w-full max-w-xl grid-cols-2 gap-4">
          <button
            onClick={onStart}
            className="group flex min-h-36 flex-col items-start justify-between rounded-2xl border border-cyber-blue/45 bg-cyber-blue/[0.12] p-5 text-left transition-all hover:scale-[1.02] hover:bg-cyber-blue/[0.18] active:scale-[0.98]"
            style={{ boxShadow: '0 0 30px rgba(0,212,255,0.16), 0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyber-blue/75">Local Mode</span>
            <span className="font-mono text-2xl font-black uppercase tracking-wide text-white">Single Player</span>
            <span className="font-mono text-xs leading-relaxed text-white/50">
              Fight the AI, control start/pause/speed, build defenses, and attack the enemy data center.
            </span>
          </button>

          <button
            disabled
            className="flex min-h-36 cursor-not-allowed flex-col items-start justify-between rounded-2xl border border-white/[0.08] bg-dark-700/45 p-5 text-left opacity-55"
          >
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-white/35">Online Mode</span>
            <span className="font-mono text-2xl font-black uppercase tracking-wide text-white/50">Multiplayer</span>
            <span className="font-mono text-xs leading-relaxed text-white/35">
              Coming soon. Controls will be match-authoritative when real players connect.
            </span>
          </button>
        </div>

        <p className="font-mono text-xs text-white/30">Press [Space] to choose Single Player</p>
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
          <StatLine label="Mode" value={state.gameMode === 'single_player' ? 'Single Player' : 'Match'} />
          <StatLine label="Score" value={formatCompactCount(state.score)} />
          <StatLine label="Kills" value={formatCompactCount(state.totalKills)} />
          <StatLine label="Gold Earned" value={formatCompactCount(state.totalGoldEarned)} />
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

function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const baseDestroyed = state.playerBaseHp <= 0;
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <div className="absolute inset-0 bg-dark-900/75 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 bg-dark-800/95 border border-red-500/40 rounded-3xl p-8" style={{ boxShadow: '0 0 40px rgba(255,68,68,0.2)' }}>
        <div className="text-5xl">💀</div>
        <h2 className="text-3xl font-black text-red-400 uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 20px rgba(255,68,68,0.5)' }}>
          Game Over
        </h2>
        <p className="text-white/50 text-sm font-mono">
          {baseDestroyed ? 'Your data center was destroyed.' : 'The defense line collapsed.'}
        </p>
        <div className="flex flex-col gap-2 text-center">
          <StatLine label="Mode" value={state.gameMode === 'single_player' ? 'Single Player' : 'Match'} />
          <StatLine label="Base HP" value={`${state.playerBaseHp} / ${state.maxPlayerBaseHp}`} />
          <StatLine label="Enemy Core" value={`${state.opponentBaseHp} / ${state.maxOpponentBaseHp}`} />
          <StatLine label="Final Score" value={formatCompactCount(state.score)} />
          <StatLine label="Total Kills" value={formatCompactCount(state.totalKills)} />
          <StatLine label="Towers Built" value={state.towers.filter(tower => tower.owner === 'player').length} />
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
  const opponentDestroyed = state.opponentBaseHp <= 0;
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <div className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 bg-dark-800/95 border border-yellow-400/40 rounded-3xl p-8" style={{ boxShadow: '0 0 60px rgba(255,204,0,0.2)' }}>
        <div className="text-5xl animate-bounce">🏆</div>
        <h2 className="text-3xl font-black uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', color: '#ffcc00', textShadow: '0 0 30px rgba(255,204,0,0.6)' }}>
          Victory!
        </h2>
        <p className="text-white/50 text-sm font-mono">
          {opponentDestroyed ? 'Opponent data center destroyed!' : 'Match won.'}
        </p>
        <div className="flex flex-col gap-2 text-center">
          <StatLine label="Base HP" value={`${state.playerBaseHp} / ${state.maxPlayerBaseHp}`} />
          <StatLine label="Enemy Core" value={`${state.opponentBaseHp} / ${state.maxOpponentBaseHp}`} />
          <StatLine label="Final Score" value={formatCompactCount(state.score)} />
          <StatLine label="Total Kills" value={formatCompactCount(state.totalKills)} />
          <StatLine label="Gold Earned" value={formatCompactCount(state.totalGoldEarned)} />
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
      <span className="text-sm text-white/45 font-mono">{label}</span>
      <span className="text-base font-bold text-white font-mono">{value}</span>
    </div>
  );
}
