import React from 'react';
import type { GameState, TowerType } from '../game/types';
import { CELL_SIZE, TOWER_DEFS } from '../game/constants';

interface TowerShopProps {
  state: GameState;
  onSelectTower: (type: TowerType | null) => void;
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
  onDeselect: () => void;
}

/** Shop strip + briefing column + gap; footer must never shrink narrower or cards clip entirely. */
const SHOP_SHELL_MIN_W = 520 + 220 + 12;

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
  const selectedType = state.selectedTowerType;

  return (
    <div
      className="flex h-full min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden select-none [scrollbar-width:thin]"
      style={{ minWidth: SHOP_SHELL_MIN_W }}
    >
      <div className="flex h-full min-h-0 w-[520px] shrink-0 flex-col rounded-xl border border-cyber-blue/20 bg-dark-900/70 p-3">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-cyber-blue rounded-full shadow-cyber" />
            <span className="text-[11px] text-white/40 uppercase tracking-widest font-mono">Tower Shop</span>
          </div>
          <span className="text-[9px] text-white/25 font-mono">[1-5]</span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-5 gap-2 [grid-template-rows:minmax(0,1fr)]">
          {(Object.keys(TOWER_DEFS) as TowerType[]).map(type => {
            const def = TOWER_DEFS[type];
            const isSelected = selectedType === type;
            const canAfford = state.gold >= def.cost;

            return (
              <button
                key={type}
                onClick={() => onSelectTower(isSelected ? null : type)}
                className={`relative flex h-full min-h-0 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-cyber-blue/80 bg-cyber-blue/15 shadow-cyber'
                    : canAfford
                      ? 'border-white/10 bg-dark-700 hover:border-white/30 hover:bg-dark-600'
                      : 'border-white/5 bg-dark-700 opacity-40 cursor-not-allowed'
                }`}
                disabled={!canAfford && !isSelected}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center border"
                  style={{
                    background: `${def.color}22`,
                    borderColor: `${def.accentColor}44`,
                    boxShadow: isSelected ? `0 0 12px ${def.accentColor}44` : 'none',
                  }}
                >
                  <TowerSvgIcon type={type} color={def.accentColor} />
                </div>

                <span className="text-[11px] font-bold font-mono text-white/90">{def.name}</span>
                <span className={`text-[10px] font-mono font-bold ${canAfford ? 'text-yellow-300' : 'text-red-400'}`}>
                  ◆ {def.cost}
                </span>

                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-blue rounded-full shadow-cyber" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-[220px] flex-1 overflow-hidden rounded-xl border border-cyber-blue/20 bg-dark-900/70 p-3">
        {selectedTower ? (
          <SelectedTowerPanel
            state={state}
            tower={selectedTower}
            onUpgrade={onUpgrade}
            onSell={onSell}
            onDeselect={onDeselect}
          />
        ) : selectedType ? (
          <SelectedBuildPanel type={selectedType} />
        ) : (
          <BriefingPlaceholder />
        )}
      </div>
    </div>
  );
}

/** Same scaffold as SelectedBuildPanel so layout does not snap when picking a tower. */
function BriefingPlaceholder() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-dark-700/70">
          <TowerBriefingGlyph />
        </div>
        <div>
          <p className="font-mono text-xs font-bold text-white/55">Briefing</p>
          <p className="font-mono text-[10px] text-white/25">Pick a tower to preview</p>
        </div>
      </div>

      <p className="mb-2 font-mono text-[11px] leading-snug text-white/35">
        Select a tower in the shop or a built turret on the grid to inspect stats, traits, upgrades, or placement.
      </p>

      <div className="space-y-1 border-t border-white/10 pt-2">
        <p className="font-mono text-[10px] leading-snug text-white/22">◇ Tower traits and perks list here.</p>
      </div>

      <div className="mt-auto grid grid-cols-4 gap-2">
        <StatTile label="DMG" value="—" muted />
        <StatTile label="RNG" value="—" muted />
        <StatTile label="DPS" value="—" muted />
        <StatTile label="RATE" value="—" muted />
      </div>
    </div>
  );
}

function TowerBriefingGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-cyber-blue/45" aria-hidden>
      <rect x="2.5" y="2.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" opacity="0.9" />
      <path d="M6 7h6M6 9.5h4M6 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

function SelectedBuildPanel({ type }: { type: TowerType }) {
  const def = TOWER_DEFS[type];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: `${def.color}22`, borderColor: `${def.accentColor}55` }}>
          <TowerSvgIcon type={type} color={def.accentColor} />
        </div>
        <div>
          <p className="text-xs font-bold font-mono text-white">{def.name}</p>
          <p className="text-[10px] text-white/30 font-mono">Click grid to place</p>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-white/60 font-mono mb-2">{def.description}</p>
      <TraitList lines={getTowerTraitLines(type)} />

      <div className="grid grid-cols-4 gap-2 mt-auto">
        <StatTile label="DMG" value={def.damage} />
        <StatTile label="RNG" value={`${def.range.toFixed(1)}c`} />
        <StatTile label="DPS" value={(def.damage * def.fireRate).toFixed(0)} />
        <StatTile label="RATE" value={`${def.fireRate}/s`} />
      </div>
    </div>
  );
}

function SelectedTowerPanel({ state, tower, onUpgrade, onSell, onDeselect }: {
  state: GameState;
  tower: GameState['towers'][number];
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
  onDeselect: () => void;
}) {
  const def = TOWER_DEFS[tower.type];
  const upgradeCost = def.upgradeCost[tower.level - 1];

  return (
    <div className="h-full flex gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: `${def.color}33`, borderColor: `${def.accentColor}66` }}>
              <TowerSvgIcon type={tower.type} color={def.accentColor} />
            </div>
            <div>
              <p className="text-xs font-bold font-mono text-white">{def.name}</p>
              <div className="flex gap-1 mt-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full border"
                    style={{
                      background: i < tower.level ? def.accentColor : 'transparent',
                      borderColor: def.accentColor,
                      boxShadow: i < tower.level ? `0 0 4px ${def.accentColor}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-white/30 font-mono">Kills {tower.kills}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatTile label="DMG" value={tower.damage} />
          <StatTile label="RNG" value={`${(tower.range / CELL_SIZE).toFixed(1)}c`} />
          <StatTile label="RATE" value={`${tower.fireRate.toFixed(1)}/s`} />
          <StatTile label="DPS" value={(tower.damage * tower.fireRate).toFixed(0)} />
        </div>

        <TraitList lines={getTowerTraitLines(tower.type, tower.level)} />
      </div>

      <div className="w-40 flex flex-col gap-2 justify-center">
        {tower.level < 3 ? (
          <button
            onClick={() => onUpgrade(tower.id)}
            disabled={state.gold < upgradeCost}
            className="flex items-center justify-between px-3 py-2 bg-cyber-blue/15 border border-cyber-blue/50 rounded-xl text-cyber-blue font-bold font-mono text-xs hover:bg-cyber-blue/25 hover:shadow-cyber transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Lv.{tower.level + 1}</span>
            <span className="text-yellow-300">◆ {upgradeCost}</span>
          </button>
        ) : (
          <div className="text-center py-2 text-[10px] text-cyber-green font-mono uppercase tracking-widest">
            Max Level
          </div>
        )}
        <button
          onClick={() => onSell(tower.id)}
          className="flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs hover:bg-red-500/20 hover:border-red-500/50 transition-all"
        >
          <span>Sell</span>
          <span className="text-yellow-300">◆ {Math.floor(def.cost * 0.6)}</span>
        </button>
        <button
          onClick={onDeselect}
          className="px-3 py-2 border border-white/10 rounded-xl text-white/40 font-mono text-xs hover:text-white/60 hover:border-white/20 transition-all"
        >
          Deselect
        </button>
      </div>
    </div>
  );
}

function TraitList({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1 border-t border-white/10 pt-2">
      {lines.slice(0, 3).map(line => (
        <p key={line} className="text-[10px] leading-snug text-white/45 font-mono">
          {line}
        </p>
      ))}
    </div>
  );
}

function StatTile({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div
      className={`rounded-md border border-white/5 px-2 py-1 ${muted ? 'border-white/[0.04] bg-dark-800/55' : 'bg-dark-700/80'}`}
    >
      <p className="font-mono text-[8px] text-white/25">{label}</p>
      <p
        className={`truncate font-mono text-[10px] font-bold ${muted ? 'text-white/35' : 'text-white/80'}`}
      >
        {value}
      </p>
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
