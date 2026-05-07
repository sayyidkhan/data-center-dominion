import React from 'react';
import type { GameState } from '../game/types';
import { ENEMY_DEFS, MAX_WAVES, WAVE_DEFS, type WaveDef } from '../game/constants';
import { formatCompactCount } from '../formatCompactCount';

interface HUDProps {
  state: GameState;
  onStartWave: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
}

/** Single-row scrolling strip — avoids tiny wrapped text when many enemy types. */
function WaveEnemyChips({ groups }: { groups: WaveDef['enemies'] }) {
  return (
    <div
      className="-mx-0.5 flex min-h-[2.125rem] w-full max-w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain whitespace-nowrap py-1 pl-0.5 pr-1 [scrollbar-width:thin] sm:min-h-[2.25rem] [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyber-green/25 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/[0.04]"
      role="list"
      aria-label="Wave enemy roster"
    >
      {groups.map((group, i) => {
        const def = ENEMY_DEFS[group.type];
        return (
          <span
            key={`${group.type}-${i}`}
            role="listitem"
            title={`${group.type} × ${group.count}`}
            className="inline-flex max-w-[min(100%,14rem)] shrink-0 items-center gap-1 rounded-lg border border-white/[0.14] bg-dark-900/55 px-2 py-0.5 pl-1.5 font-mono text-xs tabular-nums sm:min-h-8 sm:px-2.5 sm:py-1 sm:text-[0.8125rem]"
          >
              <span
                className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                style={{ background: def.color, boxShadow: `0 0 5px ${def.color}` }}
              />
              <span className="min-w-0 truncate capitalize leading-tight tracking-tight text-white/[0.92]">{group.type}</span>
              <span className="shrink-0 font-bold tabular-nums leading-none text-white/60">×{group.count}</span>
            </span>
          );
        })}
    </div>
  );
}

function HudStatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs font-semibold uppercase tracking-wide text-white/55">{children}</span>
  );
}

function LivesRing({ value, max, pct, color }: { value: number; max: number; pct: number; color: string }) {
  const size = 40;
  const stroke = 3;
  const r = (size - stroke) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * c;

  return (
    <div
      className="relative h-10 w-10 shrink-0"
      title={`${value} / ${max} lives`}
      aria-label={`Lives ${value} of ${max}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-dark-600"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="transition-[stroke-dasharray] duration-300"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

export function HUD({ state, onStartWave, onPause, onSetSpeed }: HUDProps) {
  const wavePct =
    state.waveSpawned > 0 ? (state.waveSpawned / (state.enemiesInWave.length || 1)) * 100 : 0;
  const nextWaveIdx = Math.min(state.wave, MAX_WAVES - 1);
  const nextWave = WAVE_DEFS[nextWaveIdx];
  const totalEnemies = nextWave?.enemies.reduce((s, g) => s + g.count, 0) ?? 0;

  /** Mid-wave gameplay (spawn + combat); pause still shows same strip. */
  const liveWave = state.phase === 'playing' || state.phase === 'paused';
  const showSpawnBar = liveWave && state.waveSpawned > 0 && state.enemiesInWave.length > 0;
  const waveTotalNow = state.enemiesInWave.length;
  const clearGoldThisWave = state.wave > 0 ? WAVE_DEFS[state.wave - 1]?.goldBonus : undefined;
  /** Roster chips to show mid-wave — same layout as between-break “next wave” preview (wave 0 uses incoming wave). */
  const activeWaveRoster: WaveDef['enemies'] | undefined = liveWave
    ? state.wave >= 1 && state.wave <= MAX_WAVES
      ? WAVE_DEFS[state.wave - 1]?.enemies
      : nextWave?.enemies
    : undefined;
  /** Incoming roster when idle; active roster when fighting (includes wave 0 prep). */
  const rosterGroups: WaveDef['enemies'] | undefined = liveWave
    ? activeWaveRoster
    : nextWave?.enemies?.length
      ? nextWave.enemies
      : undefined;

  const livesPct = (state.lives / state.maxLives) * 100;
  const livesColor = livesPct > 60 ? '#00ff88' : livesPct > 30 ? '#ffcc00' : '#ff4444';

  const showStartWaveBtn =
    state.phase === 'wave_complete' || (state.phase === 'playing' && state.wave === 0);

  const nextWaveToStart = Math.min(state.wave + 1, MAX_WAVES);
  const startWaveActionLabel = `Start wave ${nextWaveToStart}`;
  const startWaveHoverHint =
    state.wave >= MAX_WAVES
      ? 'No more waves'
      : `Next round — click ▶ to start wave ${nextWaveToStart}`;

  const speedPresetButtons = [0.5, 1, 2, 3].map(speed => (
    <button
      key={speed}
      type="button"
      onClick={() => onSetSpeed(speed)}
      className={`min-w-[2.125rem] rounded-md px-2 py-1.5 font-mono text-sm transition-all ${
        state.gameSpeed === speed
          ? 'bg-cyber-blue font-bold text-dark-900 shadow-cyber'
          : 'text-white/55 hover:text-white'
      }`}
    >
      {speed === 0.5 ? '0.5x' : `${speed}x`}
    </button>
  ));

  return (
    <div className="grid h-full min-h-0 min-w-0 w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] items-center gap-x-3 px-3 py-3 bg-dark-800 select-none overflow-hidden">
      {/* Left — resource strip (must clamp to viewport: w-max/chrome used to widen past VIEWPORT_W) */}
      <div className="flex min-h-0 min-w-0 max-h-full w-full items-center self-center overflow-hidden border-r border-white/[0.07] pr-2">
        <div className="flex min-w-0 w-full max-w-full items-stretch overflow-hidden">
          <div className="flex shrink-0 flex-col justify-center gap-1.5 border-r border-white/[0.08] pr-2 sm:pr-3">
            <HudStatLabel>Lives</HudStatLabel>
            <LivesRing
              value={state.lives}
              max={state.maxLives}
              pct={livesPct}
              color={livesColor}
            />
          </div>

          <div className="grid min-h-[2.75rem] min-w-0 flex-1 grid-cols-3 divide-x divide-white/[0.08]">
            <div className="flex min-w-0 flex-col justify-center gap-1.5 px-2 sm:px-3">
              <HudStatLabel>Gold</HudStatLabel>
              <span className="inline-flex min-w-0 max-w-full items-baseline gap-1 truncate font-mono text-lg font-bold leading-none tabular-nums text-yellow-300">
                <span className="shrink-0 text-yellow-400/90 text-base leading-none">◆</span>
                <span className="min-w-0 truncate">{formatCompactCount(state.gold)}</span>
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-1.5 px-2 sm:px-3">
              <HudStatLabel>Score</HudStatLabel>
              <span className="truncate font-mono text-lg font-bold leading-none tabular-nums text-cyber-blue">
                {formatCompactCount(state.score)}
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-1.5 px-2 sm:px-3">
              <HudStatLabel>Kills</HudStatLabel>
              <span className="font-mono text-lg font-bold leading-none tabular-nums text-cyber-purple">
                {formatCompactCount(state.totalKills)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center — wave panel height-capped inside fixed HUD row (grid-rows keeps header from growing with content) */}
      <div className="flex min-h-0 min-w-0 max-h-full justify-center overflow-hidden px-px py-2">
        <div
          className="box-border flex max-h-full min-h-0 w-full max-w-xl flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-xl border border-solid border-cyber-green/35 bg-cyber-green/[0.08] px-2.5 py-1.5 shadow-[0_8px_26px_rgba(0,0,0,0.35),0_0_14px_rgba(0,255,136,0.08)] sm:gap-2 sm:px-3 sm:py-2"
          style={{ backgroundClip: 'padding-box' }}
        >
          {/* Row 1 — status only (matches live card); totals right */}
          <div className="flex shrink-0 min-h-0 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-solid border-white/[0.09] pb-1.5 sm:pb-2">
            <div className="flex min-h-0 min-w-0 max-w-[min(100%,20rem)] flex-[1_1_auto] flex-wrap items-center gap-x-2 gap-y-0.5 sm:max-w-none">
              <span
                className={`h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5 ${
                  state.phase === 'playing' ? 'animate-pulse bg-cyber-green' : 'bg-cyber-green/75'
                }`}
              />
              <span className="shrink-0 font-mono text-xs font-black uppercase leading-none tracking-wide text-cyber-green sm:text-sm">
                {state.phase === 'paused'
                  ? `Paused · W${state.wave}`
                  : state.phase === 'playing' && state.wave > 0
                    ? `Wave ${state.wave} · Live`
                    : state.phase === 'wave_complete' && state.wave > 0
                      ? `Wave ${state.wave} · Clear`
                      : 'Ready'}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right font-mono sm:flex-row sm:items-center sm:gap-3 sm:text-right">
              {liveWave && waveTotalNow > 0 ? (
                <>
                  <span className="whitespace-nowrap text-xs font-semibold tabular-nums leading-none text-white/[0.72] sm:text-sm">
                    {waveTotalNow} total
                  </span>
                  {clearGoldThisWave !== undefined ? (
                    <span className="whitespace-nowrap text-xs font-bold tabular-nums leading-none text-yellow-300/95 sm:text-sm">
                      ◆ +{clearGoldThisWave}
                    </span>
                  ) : null}
                </>
              ) : nextWave && !liveWave ? (
                <>
                  <span className="whitespace-nowrap text-xs font-semibold tabular-nums leading-none text-white/[0.72] sm:text-sm">
                    {totalEnemies} total
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold tabular-nums leading-none text-yellow-300/95 sm:text-sm">
                    ◆ +{nextWave.goldBonus}
                  </span>
                </>
              ) : (
                <span className="text-[10px] leading-none text-white/25">&nbsp;</span>
              )}
            </div>
          </div>

          {/* Row 2 — same layout as live: label + meta + scrolling chips (idle uses Next wave + #) */}
          {rosterGroups && rosterGroups.length > 0 ? (
            <div className="flex min-h-0 min-w-0 flex-col gap-1 sm:gap-1.5">
              <div className="flex min-h-0 w-full min-w-0 items-center gap-2">
                {liveWave ? (
                  <>
                    <span className="hidden shrink-0 font-mono text-[9px] font-bold uppercase leading-none tracking-wide text-white/38 sm:inline sm:text-[10px]">
                      {state.wave === 0 ? 'Incoming' : 'This wave'}
                    </span>
                    <div className="shrink-0 font-mono text-[9px] font-semibold uppercase leading-none tracking-wide tabular-nums text-white/45 sm:text-[10px]">
                      {state.phase === 'paused' ? (
                        <span className="text-cyber-blue">Paused</span>
                      ) : state.wave === 0 || waveTotalNow === 0 ? (
                        <span className="text-white/35">Prep</span>
                      ) : state.waveSpawned > 0 ? (
                        <>
                          <span className="text-white/35">spawn </span>
                          <span className="text-white/65">
                            {state.waveSpawned}/{waveTotalNow}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-white/32">start…</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="hidden shrink-0 font-mono text-[9px] font-bold uppercase leading-none tracking-wide text-white/38 sm:inline sm:text-[10px]">
                      Next wave
                    </span>
                    <div className="flex shrink-0 items-baseline gap-1.5 font-mono leading-none">
                      <span className="text-base font-black tabular-nums text-cyber-green sm:text-lg">{nextWaveIdx + 1}</span>
                      {state.phase === 'playing' && state.wave === 0 ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-white/35 sm:text-[10px]">prep</span>
                      ) : null}
                    </div>
                  </>
                )}
                <div className="min-h-0 min-w-0 flex-1">
                  <WaveEnemyChips groups={rosterGroups} />
                </div>
              </div>
            </div>
          ) : !liveWave && !nextWave ? (
            <p className="py-1 text-center font-mono text-xs text-white/35">—</p>
          ) : liveWave ? (
            <p className="py-0.5 text-center font-mono text-xs text-white/35">—</p>
          ) : null}

          {/* Spawn meter */}
          {showSpawnBar ? (
            <>
              <div className="mt-0.5 shrink-0 border-t border-white/[0.08] pt-1.5" />
              <div className="h-[3px] shrink-0 overflow-hidden rounded-full bg-dark-600 sm:h-1">
                <div
                  className="h-full rounded-full bg-cyber-blue transition-all duration-200"
                  style={{ width: `${wavePct}%`, boxShadow: '0 0 6px #00d4ff' }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Right — speed presets separate from Pause / Resume / Start (matches layout during live play) */}
      <div className="flex min-h-0 min-w-0 max-h-full items-center justify-end gap-2 self-center overflow-hidden border-l border-white/[0.07] pl-2">
        <div className="mr-2 flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-dark-900/55 px-1 py-1">
          {speedPresetButtons}
        </div>

        {showStartWaveBtn ? (
          <button
            type="button"
            onClick={onStartWave}
            disabled={state.wave >= MAX_WAVES}
            title={startWaveHoverHint}
            aria-label={state.wave >= MAX_WAVES ? 'No more waves' : `${startWaveActionLabel}. Primary control to begin the next round.`}
            className="flex shrink-0 flex-row items-center gap-1.5 rounded-lg border border-cyber-green/35 bg-cyber-green/[0.08] px-2 py-1.5 transition-[color,background-color,box-shadow,transform,border-color] motion-safe:animate-pulse hover:animate-none hover:border-cyber-green/55 hover:bg-cyber-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-green/35 active:scale-[0.98] disabled:animate-none disabled:cursor-not-allowed disabled:border-white/12 disabled:bg-dark-700/50 disabled:opacity-40 sm:gap-2 sm:px-3 sm:py-2"
          >
            <span
              aria-hidden
              className="shrink-0 font-mono text-sm font-bold leading-none text-cyber-green drop-shadow-[0_0_8px_rgba(0,255,136,0.55)]"
            >
              ▶
            </span>
            <span className="whitespace-nowrap font-mono text-sm font-semibold uppercase leading-none tracking-wide text-cyber-green/80">
              {state.wave === MAX_WAVES ? 'Done' : state.wave === 0 ? 'Start' : `Wave ${state.wave + 1}`}
            </span>
          </button>
        ) : null}

        {state.phase === 'playing' ? (
          <button
            type="button"
            onClick={onPause}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-dark-700/90 px-3 py-2 font-mono text-sm font-semibold text-white/85 transition-colors hover:border-white/35 hover:text-white"
          >
            <span aria-hidden>⏸</span> Pause
          </button>
        ) : null}
        {state.phase === 'paused' ? (
          <button
            type="button"
            onClick={onPause}
            className="animate-pulse flex shrink-0 items-center gap-1.5 rounded-lg border border-cyber-blue/45 bg-cyber-blue/15 px-3 py-2 font-mono text-sm font-semibold text-cyber-blue transition-colors hover:bg-cyber-blue/25"
          >
            <span aria-hidden>▶</span> Resume
          </button>
        ) : null}
      </div>
    </div>
  );
}
