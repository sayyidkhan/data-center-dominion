# Tower Dominion Web Rebuild Notes

Research date: 2026-05-06

This document summarizes the public game design of Tower Dominion and translates it into a practical web rebuild plan. Use this as a product/design brief, not as a plan to copy proprietary art, branding, exact data tables, or protected assets.

## Primary Sources

- Official site: https://towerdominion.com/
- Steam page: https://store.steampowered.com/app/3226530/Tower_Dominion/
- Wiki.gg main page: https://towerdominion.wiki.gg/
- Wiki.gg buildings: https://towerdominion.wiki.gg/wiki/Buildings
- Wiki.gg commanders: https://towerdominion.wiki.gg/wiki/Commander
- Wiki.gg doctrines: https://towerdominion.wiki.gg/wiki/Doctrines
- Wiki.gg building category: https://towerdominion.wiki.gg/wiki/Category:Buildings
- Wiki.gg commander category: https://towerdominion.wiki.gg/wiki/Category:Commanders
- Wiki.gg resources: https://towerdominion.wiki.gg/wiki/Supply, https://towerdominion.wiki.gg/wiki/Recon, https://towerdominion.wiki.gg/wiki/Tech
- Wiki.gg examples: https://towerdominion.wiki.gg/wiki/Main_headquarters, https://towerdominion.wiki.gg/wiki/Mirador, https://towerdominion.wiki.gg/wiki/Platform, https://towerdominion.wiki.gg/wiki/Warwolf_position

## High-Level Game Identity

Tower Dominion is a single-player roguelike tower defense game with base building, resource management, tactical path control, and run-to-run unlocks.

The distinctive hook is battlefield shaping. The player expands and modifies terrain tiles to control enemy routes, create choke points, use height, and place limited defensive buildings. Towers are not simply purchased from a shop; buildings and upgrades are limited rewards, so placement and selection matter.

The public sources describe:

- Build and design terrain while defending a stronghold.
- Choose from factions and 30 heroes/commanders.
- Survive enemy waves.
- Upgrade destructive towers.
- Draft rewards after waves.
- Unlock heroes, building upgrades, doctrines, difficulties, and Codex secrets over progression.
- Four difficulty levels plus an endless Frontier Mode.

## Core Loop

The run starts with:

- Faction selection.
- Commander/hero selection.
- Difficulty selection.
- Headquarters placed at the center of the battlefield.
- Starting blueprints, publicly documented as 2x Mirador and 1x Sturdy Bunker for the base start.

Each wave appears to follow this structure:

1. Reinforcement phase.
   The player chooses from doctrines, blueprints, and/or currencies.
2. Expansion phase.
   The player places a new terrain tile every other wave.
3. Build phase.
   The player places available building blueprints and upgrades existing buildings.
4. Combat phase.
   The player starts the wave. Foes spawn from entry points and move toward the headquarters.

The objective is to survive the final wave without headquarters HP reaching zero. The wave count depends on difficulty. On the last wave, a random malus may apply.

## Battlefield Model

The battlefield is tile-based. The central headquarters is the target. Enemies spawn from multiple entry points and path toward the HQ.

Important battlefield mechanics:

- Terrain expansion is a player decision, not just a static map.
- Tile placement changes enemy pathing.
- New tiles can create choke points or split routes.
- Height matters for strategy.
- Some buildings can modify height, e.g. Platform increases height by 1 and can be built on.
- Neutral buildings can appear on placed tiles.
- Pits can be forced by creating dead-end paths with no further possible tile placement.

For the web MVP, model the battlefield as a square or hex grid. A square grid is faster to implement. Hex/isometric can be added later if the visual target requires it.

## Buildings

Buildings are grouped into three broad types:

- Blueprints: player-controlled buildings that can be placed.
- Neutral buildings: generated on placed tiles, with appearance chance influenced by Discovery.
- Pits: special outcomes from dead-end terrain/path construction.

Known building examples from public wiki pages include:

- Main Headquarters: central base, 2000 HP in one documented page, must be protected.
- Mirador: simple early defensive structure with Defender M5 weapon and upgrade paths.
- Sturdy Bunker: starting blueprint.
- Warwolf Position: long-range explosive cannon, strong against packs, weaker against single high-health targets.
- Light Mortar Position: simple mortar against small foes.
- Platform: raises height by 1 and can be built upon.
- Supply Point: neutral building, +40 Supply production.
- Classified Site: neutral building, grants Supply when building adjacent.
- Zone Command: support building that can request resources or mount weapons.

The building category lists 74 pages, so a full rebuild should use a data-driven building registry rather than hardcoded tower classes.

## Weapons And Targeting

Weapons are attached to buildings. Public examples show weapon stats such as:

- Damage.
- DPS.
- Fire rate.
- Reload speed.
- Magazine size.
- Explosion size.
- Max targets.
- Priority rules.
- Special effects.

Observed effects and targeting concepts:

- Area of Effect: can hit multiple targets.
- Anti-Air: bonus damage against air units.
- Detection: can fire on camouflaged units.
- Priority examples include closest to HQ, most shield, and most HP.

For the web MVP, weapon behavior should be data-driven:

```ts
type Weapon = {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  aoeRadius?: number;
  targetPriority: "closestToHQ" | "first" | "mostHp" | "mostShield";
  tags: Array<"aoe" | "antiAir" | "detection">;
};
```

## Resources

Public sources identify at least three resources:

- Supply: base resource for buildings and most upgrades.
- Recon: strategic resource for rerolling zones during expansion, plus some buildings/upgrades.
- Tech: rare resource for powerful upgrades.

Supply sources include wave income, commanders, kills, buildings/upgrades, neutral buildings, and doctrines. One page states +100 Supply at the start of the game; the same wiki also discusses Supply production by wave/difficulty on other pages, so exact values should be treated as tunable until verified in-game.

Tech is difficulty-dependent at run start in the public wiki:

- Difficulty 1: 6 Tech.
- Difficulty 2: 8 Tech.
- Difficulty 3: 10 Tech.
- Difficulty 4: 10 Tech.
- Frontier Mode: 10 Tech.

## Commanders And Factions

Commanders, also called heroes, provide two positive effects called Powers. Each faction has 10 unique commanders.

The commander category lists 30 commander pages, matching the official/Steam claim of 30 heroes. One example:

- Architectus Droh:
  - Building costs reduced by 15%.
  - All buildings gain +50% HP.

Factions have distinct:

- Biomes.
- Towers/buildings.
- Strategies.
- Playstyles.
- Hero rosters.

Known faction names from wiki building pages:

- Iron Dragoons.
- Lions of Ravelski.
- Pargan Assault Group.

For the web MVP, start with one faction and three commander archetypes:

- Engineer: cheaper buildings, higher structure HP.
- Artillerist: stronger AoE and longer range.
- Scout: more Recon, higher neutral discovery chance.

## Doctrines And Roguelike Rewards

Doctrines are modifiers obtained during the reinforcement phase after a wave.

Public structure:

- Regular doctrines.
- Building doctrines.
- Regular doctrines are divided into three tiers.
- Building doctrines include cost and efficiency boosts.
- Building doctrines only appear after the relevant building blueprint has been placed.
- After obtaining four building doctrines, an expertise doctrine can appear.

The doctrine category lists 197 pages, so this is a major replayability system.

For the web MVP:

- Offer three rewards after every wave.
- Reward types: blueprint, doctrine, Supply, Recon, Tech.
- Doctrines should modify global stats, building family stats, or reward economy.
- Add weighted rarity later.

## Enemies

Public sources describe enemies as Artronids/alien foes. Each wave spawns enemies spread across all entry points. Enemy count and type depend on the wave. Each foe has unique stats:

- HP.
- Speed.
- Passive abilities.
- Movement behavior.

Important enemy traits implied by weapon/building pages:

- Air units.
- Camouflaged units.
- Shielded units.
- High-HP units.
- Swarms of weak units.

For the web MVP, implement:

- Swarmer: low HP, fast, appears in groups.
- Brute: high HP, slow.
- Shielded: medium speed, shield value.
- Flyer: ignores some terrain constraints.
- Camouflaged: only targetable by detection weapons or melee/interceptor units.

## Progression And Unlocks

Run-to-run progression includes unlocking:

- Buildings.
- Building upgrades.
- Commanders.
- Doctrines.
- Difficulty levels.

Steam also mentions achievements, Codex secrets, four difficulty levels, and endless Frontier Mode.

For a first web version, progression can be local-only:

- Store unlocks in localStorage.
- Unlock a new commander after first win.
- Unlock a new building after placing 20 towers.
- Unlock Frontier Mode after beating standard difficulty.

## Web Rebuild MVP

The fastest good prototype should target a playable 10-wave browser game.

Minimum systems:

- Canvas or WebGL grid battlefield.
- HQ in the center with HP.
- Enemy spawn points at map edges.
- Pathfinding from spawn points to HQ.
- Terrain tile placement every other wave.
- Building placement from limited blueprints.
- Three starter buildings: Mirador, Sturdy Bunker, Warwolf.
- Three resources: Supply, Recon, Tech.
- Combat simulation with projectiles or hitscan.
- Reward draft after each wave.
- Three commanders.
- One faction.
- Win/loss state.

Recommended implementation stack:

- React + TypeScript for UI.
- Phaser 3 for the 2D game loop, pathing display, sprites, and input.
- Zustand or a simple reducer for run state.
- Data files for buildings, weapons, enemies, doctrines, waves, and commanders.

Avoid using the original game name, exact art, icons, logos, text, and balancing tables in a shipped product. The rebuild should be mechanically inspired but visually and narratively original.

## Suggested File/Data Model

```text
src/game/
  data/
    buildings.ts
    weapons.ts
    enemies.ts
    doctrines.ts
    commanders.ts
    waves.ts
  systems/
    pathfinding.ts
    combat.ts
    rewards.ts
    economy.ts
    progression.ts
  scenes/
    BattleScene.ts
  ui/
    BuildPanel.tsx
    RewardDraft.tsx
    CommanderSelect.tsx
```

## Design Risks

- Path shaping is the hard part. If the pathfinder allows invalid full blocks, the player can trivialize the game. We need rules that always preserve at least one valid route from each spawn to HQ.
- Reward drafting needs enough variety to feel roguelike. Too few doctrines will make runs feel samey.
- Exact data replication from the wiki is not ideal for a commercial rebuild. Use original names, art, values, and fiction.
- Browser performance can degrade with many enemies/projectiles. Use object pooling and simple collision checks.

## Recommended First Milestone

Build a greybox prototype:

- 20x20 grid.
- HQ at center.
- 2 spawn points.
- A* pathfinding.
- One terrain placement action every 2 waves.
- Three towers.
- Three enemy types.
- 10 waves.
- Reward draft with 12 initial doctrines.

Success criteria:

- A full run can be won or lost.
- Enemy paths visibly update after terrain placement.
- Towers automatically target and fire.
- Rewards meaningfully change strategy.
- No original Tower Dominion assets are required.
