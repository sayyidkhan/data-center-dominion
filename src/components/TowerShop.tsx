import React from 'react';
import type { GameState, TowerType } from '../game/types';
import { TOWER_DEFS } from '../game/constants';

interface TowerShopProps {
  state: GameState;
  onSelectTower: (type: TowerType | null) => void;
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
  onDeselect: () => void;
}

const TOWER_ICONS: Record<TowerType, string> = {
  cannon: '🔫',
  laser: '⚡',
  frost: '❄️',
  tesla: '⚡',
  missile: '🚀',
};

function getTowerTraitLines(type: TowerType, level = 1): string[] {
  switch (type) {
    case 'cannon': {
      const chance = [0, 35, 50, 65][level];
      const armorBreak = [0, 3, 6, 10][level];
      const exposed = [0, 15, 25, 40][level];
      const duration = [0, 3, 4, 5][level];
      return [
        `${chance}% chance to apply a debuff on hit.`,
        `Armor crack: -${armorBreak} armor for ${duration}s.`,
        `Expose: +${exposed}% damage taken for ${duration}s.`,
      ];
    }
    case 'frost':
      return ['Large AoE slow.', '20% chance to freeze for 1s before slowing.'];
    case 'laser':
      return ['Sustained beam DPS.', 'Fires for 2s, cools for 1s.'];
    case 'tesla':
      return [`Chain zap with ${level + 1} hops.`, 'Can bounce back if no fresh creep is nearby.'];
    case 'missile':
      return ['Heavy splash damage.', 'Slow fire rate, best against clustered creeps.'];
  }
}

export function TowerShop({ state, onSelectTower, onUpgrade, onSell, onDeselect }: TowerShopProps) {
  const selectedTower = state.towers.find(t => t.id === state.selectedTowerId);

  return (
    <div className="w-64 bg-dark-800 border-l border-cyber-blue/20 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cyber-blue/20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-cyber-blue rounded-full shadow-cyber" />
          <span className="text-[11px] text-white/40 uppercase tracking-widest font-mono">Tower Shop</span>
        </div>
      </div>

      {/* Tower grid */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-cyber-blue/10">
        {(Object.keys(TOWER_DEFS) as TowerType[]).map(type => {
          const def = TOWER_DEFS[type];
          const isSelected = state.selectedTowerType === type;
          const canAfford = state.gold >= def.cost;

          return (
            <button
              key={type}
              onClick={() => onSelectTower(isSelected ? null : type)}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-cyber-blue/80 bg-cyber-blue/15 shadow-cyber'
                  : canAfford
                    ? 'border-white/10 bg-dark-700 hover:border-white/30 hover:bg-dark-600'
                    : 'border-white/5 bg-dark-700 opacity-40 cursor-not-allowed'
              }`}
              disabled={!canAfford && !isSelected}
            >
              {/* Tower preview */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border"
                style={{
                  background: `${def.color}22`,
                  borderColor: `${def.accentColor}44`,
                  boxShadow: isSelected ? `0 0 12px ${def.accentColor}44` : 'none',
                }}
              >
                <TowerSvgIcon type={type} color={def.accentColor} />
              </div>

              <span className="text-xs font-bold font-mono text-white/90">{def.name}</span>

              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-[10px]">◆</span>
                <span className={`text-[11px] font-mono font-bold ${canAfford ? 'text-yellow-300' : 'text-red-400'}`}>
                  {def.cost}
                </span>
              </div>

              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-blue rounded-full shadow-cyber" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tower description */}
      {state.selectedTowerType && !state.selectedTowerId && (
        <div className="p-3 border-b border-cyber-blue/10">
          <div className="bg-dark-700 rounded-xl p-3 border border-cyber-blue/20">
            {(() => {
              const def = TOWER_DEFS[state.selectedTowerType];
              return (
                <>
                  <p className="text-[11px] text-white/60 font-mono mb-2">{def.description}</p>
                  <TraitList lines={getTowerTraitLines(state.selectedTowerType)} />
                  <div className="grid grid-cols-2 gap-y-1">
                    <StatRow label="DMG" value={def.damage} />
                    <StatRow label="RNG" value={`${def.range.toFixed(1)} cells`} />
                    <StatRow label="DPS" value={(def.damage * def.fireRate).toFixed(0)} />
                    <StatRow label="Rate" value={`${def.fireRate}/s`} />
                  </div>
                </>
              );
            })()}
          </div>
          <p className="text-[10px] text-white/30 text-center mt-2 font-mono">Click grid to place</p>
        </div>
      )}

      {/* Selected tower info */}
      {selectedTower && (
        <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
          <div className="bg-dark-700 rounded-xl p-3 border border-cyber-blue/20">
            {(() => {
              const def = TOWER_DEFS[selectedTower.type];
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${def.color}33`, border: `1px solid ${def.accentColor}66` }}
                      >
                        <TowerSvgIcon type={selectedTower.type} color={def.accentColor} />
                      </div>
                      <div>
                        <p className="text-xs font-bold font-mono text-white">{def.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full border"
                              style={{
                                background: i < selectedTower.level ? def.accentColor : 'transparent',
                                borderColor: def.accentColor,
                                boxShadow: i < selectedTower.level ? `0 0 4px ${def.accentColor}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">Kills: {selectedTower.kills}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5">
                    <StatRow label="DMG" value={selectedTower.damage} />
                    <StatRow label="RNG" value={`${(selectedTower.range / 48).toFixed(1)}c`} />
                    <StatRow label="Rate" value={`${selectedTower.fireRate.toFixed(1)}/s`} />
                    <StatRow label="DPS" value={(selectedTower.damage * selectedTower.fireRate).toFixed(0)} />
                  </div>

                  <TraitList lines={getTowerTraitLines(selectedTower.type, selectedTower.level)} className="mt-3" />
                </>
              );
            })()}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {selectedTower.level < 3 && (
              <button
                onClick={() => onUpgrade(selectedTower.id)}
                disabled={state.gold < TOWER_DEFS[selectedTower.type].upgradeCost[selectedTower.level - 1]}
                className="flex items-center justify-between px-3 py-2.5 bg-cyber-blue/15 border border-cyber-blue/50 rounded-xl text-cyber-blue font-bold font-mono text-xs hover:bg-cyber-blue/25 hover:shadow-cyber transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>⬆ Upgrade to Lv.{selectedTower.level + 1}</span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-[10px]">◆</span>
                  <span className="text-yellow-300">{TOWER_DEFS[selectedTower.type].upgradeCost[selectedTower.level - 1]}</span>
                </div>
              </button>
            )}
            {selectedTower.level >= 3 && (
              <div className="text-center py-2 text-[10px] text-cyber-green font-mono uppercase tracking-widest">
                ✓ Max Level
              </div>
            )}

            <button
              onClick={() => onSell(selectedTower.id)}
              className="flex items-center justify-between px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs hover:bg-red-500/20 hover:border-red-500/50 transition-all"
            >
              <span>✕ Sell Tower</span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-[10px]">◆</span>
                <span className="text-yellow-300">
                  {Math.floor(TOWER_DEFS[selectedTower.type].cost * 0.6)}
                </span>
              </div>
            </button>

            <button
              onClick={onDeselect}
              className="px-3 py-2 border border-white/10 rounded-xl text-white/40 font-mono text-xs hover:text-white/60 hover:border-white/20 transition-all"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!state.selectedTowerType && !selectedTower && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="text-3xl opacity-20">▦</div>
          <p className="text-[11px] text-white/25 font-mono">Select a tower type to place,<br />or click a placed tower</p>
        </div>
      )}

      {/* Keyboard hints */}
      <div className="p-3 border-t border-cyber-blue/10">
        <div className="grid grid-cols-2 gap-y-1">
          {[
            ['[1-5]', 'Select tower'],
            ['[Esc]', 'Cancel/deselect'],
            ['[Space]', 'Start wave'],
            ['[P]', 'Pause'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5 col-span-1">
              <span className="text-[9px] font-mono px-1 py-0.5 bg-dark-700 border border-white/15 rounded text-white/50">{key}</span>
              <span className="text-[9px] text-white/25 font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TraitList({ lines, className = '' }: { lines: string[]; className?: string }) {
  return (
    <div className={`space-y-1 border-t border-white/10 pt-2 mb-2 ${className}`}>
      {lines.map(line => (
        <p key={line} className="text-[10px] leading-snug text-white/45 font-mono">
          {line}
        </p>
      ))}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-white/30 font-mono uppercase w-8">{label}</span>
      <span className="text-[11px] text-white/80 font-mono font-medium">{value}</span>
    </div>
  );
}

function TowerSvgIcon({ type, color }: { type: TowerType; color: string }) {
  const icons: Record<TowerType, React.ReactNode> = {
    cannon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="11" r="5" fill={color} opacity="0.8" />
        <rect x="7.5" y="1" width="3" height="10" rx="1.5" fill={color} />
      </svg>
    ),
    laser: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <polygon points="9,1 12,7 9,5 6,7" fill={color} />
        <rect x="8" y="5" width="2" height="12" rx="1" fill={color} opacity="0.7" />
        <circle cx="9" cy="17" r="2" fill={color} opacity="0.5" />
      </svg>
    ),
    frost: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <line x1="9" y1="1" x2="9" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="1" y1="9" x2="17" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="3" x2="15" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="3" x2="3" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="9" r="2.5" fill={color} />
      </svg>
    ),
    tesla: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <polygon points="9,1 13,9 10,9 11,17 5,8 9,8" fill={color} />
      </svg>
    ),
    missile: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <polygon points="9,1 11,5 11,13 9,15 7,13 7,5" fill={color} opacity="0.9" />
        <polygon points="7,5 4,9 7,9" fill={color} opacity="0.6" />
        <polygon points="11,5 14,9 11,9" fill={color} opacity="0.6" />
        <rect x="8" y="13" width="2" height="4" rx="1" fill="#ff7043" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}
