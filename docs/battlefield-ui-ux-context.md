# Battlefield UI/UX Context

Research date: 2026-05-06

This note focuses only on the battlefield experience. Menus, character selection, progression screens, and monetization screens are intentionally secondary for now.

## Sources Used

- Official site: https://towerdominion.com/
- Steam page: https://store.steampowered.com/app/3226530/Tower_Dominion/
- SteamDB screenshots/metadata: https://steamdb.info/app/3226530/screenshots/
- App Store mobile page: https://apps.apple.com/us/app/tower-dominion-go/id6743004236
- Unity Web technical limitations: https://docs.unity.cn/6000.1/Documentation/Manual/webgl-technical-overview.html
- Unity WebGL memory notes: https://docs.unity.cn/2020.3/Documentation/Manual/webgl-memory.html
- Steam Direct fee docs: https://partner.steamgames.com/doc/gettingstarted/appfee?l=french&language=english
- Local reference images:
  - `docs/reference/images/official-site-battlefield.webp`
  - `docs/reference/images/steam-screenshot-battlefield.jpg`

## Battlefield First Read

The battlefield is the game. The UI exists to support battlefield reading, path manipulation, and wave-to-wave tactical decisions. The strongest visual signal is not the HUD; it is the board itself:

- Isometric 3D tactical camera.
- Chunky square terrain tiles.
- Visible height differences.
- Pale paths cutting through green terrain.
- Large central/important buildings with strong silhouettes.
- Defensive structures on elevated platforms.
- Projectile trails and impact effects that show tower coverage.
- Enemy health bars and colored effects that identify threats.

The game does not present a flat tower-defense lane. It presents a buildable toy battlefield where the player reads the map like a tactical diorama.

## Camera And Board Composition

The camera uses a high isometric angle with enough perspective to make height readable. The board fills the screen edge-to-edge. Forest/dark foliage around the play area frames the board and makes the buildable tiles stand out.

Important UX observations:

- The camera is far enough out to show multiple battlefronts at once.
- Tile edges are rounded and thick, making terrain height readable even during combat.
- Paths are lighter than grass, so routes remain visible beneath effects.
- Buildings are oversized relative to tiles, which helps recognition.
- Combat VFX is bright and exaggerated, but the core path/terrain remains visible.

For the web rebuild, this means the first battlefield prototype should prioritize readable tile geometry before deep combat systems. A pretty tower with unreadable routes would miss the point.

## HUD Layout

The HUD uses three persistent zones:

1. Top-left economy/status cluster.
   - Commander portrait.
   - Resource counters.
   - Smaller vertical cards/tickets below the portrait.

2. Top-center HQ health.
   - Large HP number and green bar.
   - The HQ is visually treated as the run-critical object.

3. Top-right wave/control cluster.
   - Home/base icon.
   - Fast-forward/start icon.
   - Enemy/wave count with skull icon.
   - Settings gear.

Bottom zone:

- A horizontal card rail of available blueprints/actions.
- Each card shows a large item image, count/stock, and cost.
- Disabled cards are greyed out.
- The send-wave action sits on the lower right near the card rail.

The HUD uses chunky black containers, white numbers, and high-contrast iconography. This reads more like a desktop/console strategy game than a web dashboard.

## Build Card UX

The bottom rail is important because it tells the player that buildings are limited inventory items, not an infinite shop.

Observed patterns:

- Cards are large enough to identify object silhouettes.
- Count appears as a white badge near the top.
- Cost appears in a black price tag at the bottom.
- Currency icon sits beside the cost.
- Disabled/unaffordable cards become greyscale or muted.
- The card rail overlaps the battlefield but does not hide the central action.

For the web rebuild:

- Use card-like blueprint slots, not a generic dropdown/shop.
- Keep card art/silhouette prominent.
- Always show remaining count.
- Always show cost and currency.
- Use disabled visual states aggressively.
- Add hover/selection preview later, but the first version can use click-to-select.

## Terrain And Path UX

The terrain UX needs to communicate three things:

- Which cells are buildable.
- Which cells are path.
- How height affects placement and range.

In the references, the path is not an abstract line; it is an actual ground material. This is a good pattern because enemies, towers, and projectiles can all be visually anchored to it.

For the web rebuild:

- Use square tiles with visible side faces for height.
- Use a distinct road/path material.
- Use green terrain as buildable ground.
- Use darker forest or void around the playable board.
- During placement, show valid/invalid cells with color overlays.
- After terrain placement, animate or highlight the updated enemy route.

Path readability is more important than visual realism. The user should be able to understand enemy flow in under one second.

## Combat Readability

The references use bright projectile trails, explosions, enemy health bars, and shield-like effects. Combat readability comes from motion and color:

- Orange/yellow muzzle flashes and explosions show kinetic damage.
- Blue energy beams/effects suggest tech or shields.
- Red/pink projectiles and impact trails help separate enemy/tower attacks.
- Small green bars over enemies show health.
- Large black splatters/impact marks help show kills or heavy hits.

For the web rebuild:

- Start with simple projectile lines/arcs before complex particles.
- Make projectile color identify damage family.
- Use enemy health bars only when enemies are damaged or selected, unless the battlefield becomes too hard to read.
- Avoid too much UI text during combat.
- Add range rings and path arrows only during planning/placement, not constantly.

## Interaction Model

The game is designed around mouse/keyboard and controller/Steam Deck style interactions. The Steam page lists PC and Steam Deck support, and SteamDB notes that some text may be small on Steam Deck. That suggests the desktop UI can rely on hover, shortcuts, and relatively dense battlefield information, but text size can become a problem on smaller screens.

For the web rebuild:

- Primary input should be mouse first.
- Keyboard shortcuts can come after the MVP.
- Touch/mobile should not drive the first version.
- Avoid tiny text in battlefield UI; use icons, counts, and visual states.
- Keep camera controls simple: drag/pan, wheel zoom, maybe rotate later.

## Why Desktop First Instead Of Web?

Confirmed facts:

- The Steam page sells Tower Dominion as a PC game.
- SteamDB detects Unity Engine, Unity IL2CPP, Unity Burst, and related native/runtime technologies.
- Steam lists Windows requirements and Steam Deck compatibility.
- There is also a mobile App Store version, Tower Dominion GO, with free + in-app purchases.

Likely reasons for desktop/native first:

1. Performance and engine fit.
   Unity native builds are a standard path for 3D strategy games. The battlefield has many 3D objects, enemies, projectiles, VFX, shadows, and UI overlays. Native desktop gives more predictable GPU, memory, audio, input, fullscreen, and file/runtime behavior.

2. Distribution and monetization.
   Steam gives built-in discovery, wishlists, reviews, achievements, cloud saves, community hub, regional pricing, refunds, bundles, DLC, and a familiar premium purchase flow. Steam Direct requires a $100 app fee and recoups it after $1,000 adjusted gross revenue, so the barrier is low for a commercial PC release.

3. Audience fit.
   Strategy, roguelike, tower defense, RTS, and base-building players are already on Steam. A premium desktop game is easier to sell there than as a standalone web game that must solve traffic, payments, account systems, save sync, and trust from scratch.

4. Input expectations.
   Dense tactical controls are more natural with mouse/keyboard. The UI uses many small battlefield objects, cards, counters, and camera interactions. Browser/mobile can support this, but desktop is the safer first target.

5. Asset/load size.
   Steam can deliver a multi-hundred-MB or GB game normally. A web game must care more about first-load time, browser memory, caching behavior, and tab lifecycle.

6. Unity Web constraints.
   Unity Web builds can work, but Unity documents web limitations around memory, threading, networking, filesystem/cache behavior, and browser platform constraints. Those do not make a web version impossible, but they make a native Unity release less risky for a polished commercial game.

## Can This Be Done As A Web App?

Yes, technically it can be done as a web game, especially if we build a purpose-made web version rather than trying to ship a full Unity native build through WebGL.

Best web approach for this project:

- Use a 2D/isometric renderer first.
- Use Canvas/WebGL through Phaser, PixiJS, or custom Three.js.
- Keep assets stylized and lightweight.
- Make the battlefield data-driven.
- Simulate combat in TypeScript.
- Keep enemy counts and particle effects under control.
- Use localStorage/IndexedDB for saves at first.

What is realistic:

- A browser-playable battlefield prototype.
- A polished tactical web game with similar terrain/path mechanics.
- A monetizable web demo or itch.io-style release.
- Later PWA packaging or desktop wrapper if needed.

What is riskier:

- Matching native Unity visual density one-to-one in a browser.
- Heavy 3D VFX, many enemies, and large assets without load/performance problems.
- Mobile browser support with the same UI density.
- Payment/account/progression stack if monetized independently.

## Recommendation

Build the web version as a focused battlefield-first recreation, not a direct port.

Initial target:

- Desktop browser only.
- 16:9 battlefield.
- Isometric square grid.
- Stylized low-poly look.
- Bottom blueprint rail.
- Top resource/HQ/wave HUD.
- Mouse-driven placement and camera.
- 10-wave prototype.

Do not start with:

- Main menu.
- Character select.
- Account system.
- Mobile support.
- Full progression.
- Exact data clone.
- Production monetization.

The right product path is:

1. Prove the battlefield interaction is fun.
2. Prove path shaping is readable.
3. Prove building cards and limited inventory feel good.
4. Add reward drafting.
5. Add visual polish.
6. Only then decide if it should become a web demo, premium web game, Steam game, or wrapped desktop app.
