# Data Defense Destroyer — Project Vision

## 1. Concept

**Data Defense Destroyer** is a 2.5D, browser-based tower defense game with a sci‑fi / cyber aesthetic. Two **data centers** sit at opposite ends of a battlefield. Each side spawns **robots** that march toward the enemy data center, while both sides also place **turrets** to defend their lane and harass the opponent.

It is *symmetric* by design: the player and the opponent (AI in the POC, human later) play by the same rules. The fantasy is two rival data centers waging war through autonomous machines.

The first milestone is a **frontend-only proof of concept** built in a hackathon setting, with **everything authored in code** — no downloaded 3D models, textures, or audio files.

---

## 2. Pillars

1. **Dueling data centers.** Both ends of the map are active. The game is not "defend a base from waves," it is "out-build and out-push the enemy."
2. **2.5D with a rotatable camera.** True 3D scene, near-orthographic feel, player can rotate / snap the camera around the map to read the battlefield.
3. **Procedural everything.** Geometry, animations, particles, and SFX are generated in code. The neon / Tron aesthetic is the style, not a workaround.
4. **Readable at a glance.** Cyan = player, magenta = enemy, amber = danger. Glow indicates "alive / active." Every entity reads in under a second.
5. **Hackathon-shippable.** Scope is bounded so a working, fun demo exists in ~14 hours of build time.

---

## 3. Core gameplay loop

1. **Earn credits** passively over time and from destroying enemy robots.
2. **Spawn robots** from your data center down the shared lane(s).
3. **Build turrets** on buildable tiles on your side of the map.
4. **Optionally**: deploy a turret on the *enemy* side as a special ability ("Hack Drop") with a cooldown and limited lifespan.
5. **Win** by destroying the enemy data center's HP. **Lose** if yours falls first.

Match length target: **3–6 minutes** per round.

---

## 4. Entities

### Data Center (one per side)
- HP-based; visible health bar.
- Spawn point for that side's robots.
- Visual: tall slab with pulsing emissive server-rack lights.

### Robots (units)
Three archetypes for the POC:
- **Scout** — fast, low HP, low damage. Pressure tool.
- **Bruiser** — medium speed, high HP, medium damage. Tank.
- **Sapper** — slow, low HP, high damage to data center. Finisher.

All robots walk a predetermined lane via simple A* / waypoint following.

### Turrets (defenses)
Three archetypes for the POC:
- **Pulse** — cheap, fast, single-target, low damage.
- **Cannon** — expensive, slow, splash damage.
- **Beam** — continuous damage, ramps up while locked on a target.

Each turret rotates to face its target and fires procedurally-generated projectiles or beams.

### Tiles
- **Path tiles** — robots walk here, no building.
- **Buildable tiles** — turrets can be placed.
- **Owner-tinted** — cyan on player side, magenta on enemy side.

### Map
- **Elongated battlefield** — long on the Z axis so the camera communicates a sense of distance and depth when looking from one data center toward the other.
- **Multiple lanes** (2–3 parallel paths) separated by buildable terrain — gives width, enables flanking, avoids a single-corridor feel.
- **Large and open** — ~20 cols × ~40 rows, each tile is 2 world units. Camera can traverse the full length.
- **Depth fog** — subtle exponential fog in the far distance reinforces depth without hiding information.
- **Tileset source** — Kenney Tower Defense Kit (CC0 `.glb` modular pieces), one mesh per tile cell.

### Map data structure
A **2D grid array** — O(1) lookup, directly compatible with A* / easystarjs, and each cell maps 1:1 to a Kenney tile mesh.

```ts
type TileType = "buildable" | "path" | "blocked" | "base";
type TileOwner = "player" | "enemy" | "neutral";

type Tile = {
  id: string;              // "x_z"
  x: number;               // grid column
  z: number;               // grid row (depth axis)
  type: TileType;
  owner: TileOwner;
  elevation: number;       // -1 = valley, 0 = flat, 1 = raised, 2 = hill/mountain
  isWalkable: boolean;     // elevation >= 2 = impassable (natural maze wall)
  turretId: string | null; // occupied?
  pathIndex?: number;      // order in waypoint sequence
};

type GameMap = {
  cols: number;            // ~20
  rows: number;            // ~40 (elongated Z)
  tiles: Tile[][];         // tiles[z][x]
  waypoints: Vector3[][];  // one waypoint array per lane (3 lanes)
};
```

Map is authored as a plain-text template (B = buildable, P = path, N = neutral, H = hill) and parsed into the grid at load time. 3 parallel lanes run the full Z length; buildable tiles flank each lane; a neutral zone spans the middle rows.

### Terrain elevation system

| Elevation | Name | Walkable | Buildable | Effect |
|---|---|---|---|---|
| -1 | Valley | Yes | No | Robots move slightly faster |
| 0 | Flat | Yes | Yes | Normal |
| 1 | Raised | Yes | Yes | Towers get +1 range bonus |
| 2 | Hill / Mountain | **No** | No | Impassable — natural maze wall |

- Fixed elevated terrain (mountains, valleys) is **baked into the map** — robots path around it via A*.
- Player tower placement **extends the maze dynamically** — easystarjs validates at least one valid path exists before allowing a placement.
- High ground towers get a range bonus, creating real tactical decisions about where to build.
- Kenney slope/ramp/cliff tiles handle visual transitions between elevations.
- With the 2.5D camera tilted, mountains visually pop up and valleys dip — the terrain relief reads naturally.

---

## 5. Camera & controls

- **Perspective camera** — long focal length to give a 2.5D / cinematic look, not orthographic.
- **Pan** — right-click drag (or middle-mouse drag) to slide the camera across the battlefield freely.
- **Zoom** — scroll wheel, wide range (pull all the way back to see the whole map, zoom in for unit detail).
- **Rotate** — Q / E snap by 90°, or hold Alt + drag for free orbit.
- **Tilt** is constrained: camera always reads "from above and in front," never fully top-down or ground-level.
- **Left click** — select / build / interact.
- **Number keys** — quick-select turret type from build menu.
- **Space** — trigger next wave / start round.

The default view should show roughly half the battlefield so the far data center is visible but small — communicating depth and scale. Zoom out to survey, zoom in to micromanage.

---

## 6. Visual design language

- **Palette**
  - Background: `#0a0e1a` (deep navy)
  - Player accent: `#22d3ee` (cyan, emissive)
  - Enemy accent: `#f472b6` (magenta, emissive)
  - Neutral path / UI: `#94a3b8`
  - Danger / damage: `#fbbf24` (amber)
- **Forms**
  - Geometric primitives — boxes, cylinders, cones, spheres.
  - No textures. Materials are flat color + metalness + emissive.
- **Effects**
  - **Bloom** on every emissive surface.
  - **Projectile trails** with fading streaks.
  - **Hit flashes** — brief emissive scale pulse.
  - **Particle explosions** from instanced meshes on death.
  - Optional: subtle scanlines / chromatic aberration for cyber vibe.
- **HUD**
  - Tailwind-styled HTML overlay.
  - Top: data center HP bars (both sides), wave timer.
  - Bottom: build menu, credit counter, special ability cooldowns.

---

## 7. Audio

All sound generated at runtime via **Web Audio API**:
- Laser / pulse: square wave + pitch sweep.
- Explosion: white noise burst + lowpass + decay.
- UI click: short sine pop.
- Ambient drone: two detuned oscillators.

No external audio files in the POC.

---

## 8. Tech stack (POC)

| Layer | Choice |
|---|---|
| Bundler | Vite |
| Language | TypeScript |
| 3D engine | Three.js |
| React renderer | `@react-three/fiber` (R3F) |
| Helpers | `@react-three/drei` |
| Post-FX | `@react-three/postprocessing` |
| State | Zustand |
| UI / HUD | React + Tailwind CSS |
| Pathfinding | `easystarjs` (or hand-rolled A*) |
| Audio | Web Audio API (procedural) |

No backend in the POC.

### Asset strategy
**Hybrid** — use free CC0 assets where they save time and fit the style, fall back to procedural code where no good asset exists.
- **Priority sources**: Kenney.nl (Tower Defense Kit, Robot Pack, Sci-Fi Kit — all CC0), Quaternius (CC0 low-poly robots).
- **Format**: `.glb` loaded via `useGLTF()` from drei, dropped in `public/models/`.
- **Fallback**: if no asset fits or time is short, procedural primitives + emissive neon materials.
- **Audio**: procedural via Web Audio API — no `.mp3` files needed.

---

## 9. Scope: in vs. out for the POC

**In**
- Two data centers, one shared lane (or two parallel lanes).
- 3 robot types, 3 turret types.
- Symmetric AI opponent (rule-based: "spawn cheapest unit on cooldown, build cheapest turret when affordable").
- 3 waves of escalating difficulty culminating in a winner.
- Rotatable 2.5D camera with snap rotation.
- Procedural visuals + audio, neon palette, bloom.
- HUD: HP, credits, build menu, wave timer.
- Win / lose / restart screen.

**Out (for now)**
- PvP / networking.
- Persistent progression, unlocks, accounts.
- Custom downloaded models / textures / music.
- Multiple maps.
- Mobile / touch controls (desktop first).

---

## 10. Hackathon plan (~14 hours)

| Block | Hours | Goal |
|---|---|---|
| Scaffold | 0–1 | Vite + R3F + Tailwind + post-fx, camera rig with rotation. |
| World | 1–3 | Grid, lane, two data centers, lighting, bloom, palette locked. |
| Core loop | 3–6 | One robot walks lane. One turret shoots it. HP, death, credits. |
| Two-sided | 6–9 | AI opponent spawns + builds. Win / lose by data center HP. |
| Variety | 9–12 | 3 robots, 3 turrets, 3 waves, build menu UI, procedural SFX. |
| Juice | 12–14 | Particles, screen shake, hit flashes, trails, end screen. |
| Stretch | 14+ | "Hack Drop" offensive turret deploy, tutorial tooltips, polish. |

---

## 11. Success criteria for the demo

- A judge / viewer can sit down and **win or lose a match in under 6 minutes** without instruction beyond a tooltip.
- The match has at least **one moment of tension** — comeback, last-second defense, or close-fought push.
- The visual style is **clearly intentional** and consistent across every entity.
- Frame rate stays above **60 FPS** on a typical laptop with bloom enabled.
- Zero external asset dependencies in the final bundle.

---

## 12. Stretch ideas (post-hackathon)

- **Offensive turret deployment** ("Hack Drop") as a real core mechanic.
- **Special abilities / ultimates** per side (EMP, overclock, firewall shield).
- **PvP** via Supabase Realtime, Colyseus, or PartyKit.
- **Persistent meta-progression**: unlock new turret/robot archetypes between matches.
- **Map variants**: branching lanes, choke points, neutral capture nodes.
- **Replay system** + shareable match links.
- **Mobile / touch** controls and responsive layout.
