import { useGameStore } from '../store/gameStore'
import { TURRET_STATS, TURRET_COLORS } from '../game/constants'
import type { TurretType } from '../types'

const TURRET_LABELS: Record<TurretType, string> = {
  pulse:  'PULSE',
  cannon: 'CANNON',
  beam:   'BEAM',
}

const TURRET_DESC: Record<TurretType, string> = {
  pulse:  'Fast, single target',
  cannon: 'Slow, splash dmg',
  beam:   'Rapid, ramp-up DPS',
}

function HPBar({ label, hp, maxHp, color }: { label: string; hp: number; maxHp: number; color: string }) {
  const pct = hp / maxHp
  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <div className="flex justify-between text-xs" style={{ color }}>
        <span className="font-bold tracking-widest">{label}</span>
        <span>{hp}/{maxHp}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  )
}

export function HUD() {
  const phase = useGameStore((s) => s.phase)
  const wave = useGameStore((s) => s.wave)
  const playerCredits = useGameStore((s) => s.playerCredits)
  const playerBase = useGameStore((s) => s.playerBase)
  const enemyBase = useGameStore((s) => s.enemyBase)
  const selectedTurretType = useGameStore((s) => s.selectedTurretType)
  const setSelectedTurretType = useGameStore((s) => s.setSelectedTurretType)
  const startWave = useGameStore((s) => s.startWave)
  const initGame = useGameStore((s) => s.initGame)

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 select-none">
      {/* Top bar */}
      <div className="flex justify-between items-start pointer-events-none">
        {/* Player HP */}
        <HPBar label="YOUR BASE" hp={playerBase.hp} maxHp={playerBase.maxHp} color="#22d3ee" />

        {/* Center — wave info */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs tracking-[0.3em] text-gray-400 uppercase">
            {phase === 'build' ? `Wave ${wave + 1} — Build Phase` :
             phase === 'wave'  ? `Wave ${wave} — Active` :
             phase === 'victory' ? '— VICTORY —' : '— DEFEAT —'}
          </div>
          {phase === 'build' && (
            <button
              className="pointer-events-auto px-5 py-1.5 text-xs font-bold tracking-widest border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-navy transition-all uppercase"
              style={{ textShadow: '0 0 8px #22d3ee' }}
              onClick={startWave}
            >
              Launch Wave
            </button>
          )}
        </div>

        {/* Enemy HP */}
        <HPBar label="ENEMY BASE" hp={enemyBase.hp} maxHp={enemyBase.maxHp} color="#f472b6" />
      </div>

      {/* Bottom bar — build menu */}
      {(phase === 'build' || phase === 'wave') && (
        <div className="flex justify-center gap-3 pointer-events-auto">
          {/* Credits */}
          <div className="flex items-center gap-2 px-4 py-2 border border-cyan-900 bg-navy/80 text-cyan-400 text-sm font-bold tracking-widest">
            <span className="text-yellow-400">◈</span>
            <span>{playerCredits}</span>
          </div>

          {/* Turret selector */}
          {(['pulse', 'cannon', 'beam'] as TurretType[]).map((type, i) => {
            const stats = TURRET_STATS[type]
            const color = TURRET_COLORS[type]
            const selected = selectedTurretType === type
            return (
              <button
                key={type}
                className={`flex flex-col items-center px-4 py-2 border transition-all text-xs tracking-widest ${
                  selected
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-gray-700 bg-navy/80 hover:border-gray-500'
                }`}
                style={selected ? { boxShadow: `0 0 12px ${color}40` } : {}}
                onClick={() => setSelectedTurretType(type)}
              >
                <span className="font-bold" style={{ color }}>[{i + 1}] {TURRET_LABELS[type]}</span>
                <span className="text-gray-400 text-[10px]">{TURRET_DESC[type]}</span>
                <span className="text-yellow-400 text-[10px] mt-0.5">◈ {stats.cost}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Victory / Defeat overlay */}
      {(phase === 'victory' || phase === 'defeat') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-navy/70">
          <div
            className="text-5xl font-bold tracking-[0.3em] mb-4"
            style={{
              color: phase === 'victory' ? '#22d3ee' : '#f472b6',
              textShadow: `0 0 30px ${phase === 'victory' ? '#22d3ee' : '#f472b6'}`,
            }}
          >
            {phase === 'victory' ? 'VICTORY' : 'DEFEAT'}
          </div>
          <div className="text-gray-400 text-sm tracking-widest mb-8">
            {phase === 'victory' ? 'Enemy data center destroyed.' : 'Your data center has fallen.'}
          </div>
          <button
            className="px-8 py-3 border border-cyan-400 text-cyan-400 font-bold tracking-widest hover:bg-cyan-400 hover:text-navy transition-all"
            onClick={initGame}
          >
            RESTART
          </button>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-20 right-4 text-[10px] text-gray-600 tracking-widest leading-5 text-right pointer-events-none">
        <div>RIGHT CLICK + DRAG — pan</div>
        <div>SCROLL — zoom</div>
        <div>Q / E — rotate 90°</div>
        <div>1 / 2 / 3 — select turret</div>
        <div>CLICK TILE — place turret</div>
      </div>
    </div>
  )
}
