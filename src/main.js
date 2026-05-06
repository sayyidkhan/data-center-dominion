import { Application, Container, Graphics } from "pixi.js";

const shell = document.querySelector(".battlefield-shell");
const battlefield = document.querySelector("#battlefield");
const canvas = document.querySelector("#battlefield-canvas");
const resetCameraButton = document.querySelector(".reset-camera");
const zoomOutButton = document.querySelector(".zoom-out");
const zoomInButton = document.querySelector(".zoom-in");
const sendWaveButton = document.querySelector(".send-wave");
const homeButton = document.querySelector(".icon-button.home");
const playButton = document.querySelector(".icon-button.play");
const gearButton = document.querySelector(".icon-button.gear");
const waveNumber = document.querySelector("[data-wave-number]");
const waveTotal = document.querySelector("[data-wave-total]");
const alertIcon = document.querySelector(".warning-icon");
const blueprintCards = [...document.querySelectorAll(".blueprint-card")];

const fieldWidth = 3200;
const fieldHeight = 2100;
const tileW = 96;
const tileH = 50;
const tileSideH = 30;
const terrainWidth = 32;
const terrainHeight = 24;
const originX = fieldWidth / 2 - ((terrainWidth - terrainHeight) * tileW) / 4;
const originY = 260;
const defaultCamera = { x: 0, y: 70, scale: 0.56 };
const camera = { ...defaultCamera };

let selectedCardIndex = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let cameraStart = { x: 0, y: 0 };
let wave = 10;
let fastForward = false;
let app;
let world;

const path = new Set([
  ...lineKeys(1, 12, 29, 12),
  ...lineKeys(8, 6, 8, 18),
  ...lineKeys(16, 4, 16, 20),
  ...lineKeys(23, 8, 23, 22),
  ...lineKeys(4, 18, 26, 18),
  ...lineKeys(10, 9, 20, 9),
  ...lineKeys(19, 14, 30, 14)
]);

const pits = new Set(["2,5", "4,18", "6,2", "13,2", "15,4", "21,6", "27,10", "29,18", "12,21", "18,16"]);

const terrainMatrix = buildTerrainMatrix();

function keyFor(c, r) {
  return `${c},${r}`;
}

function lineKeys(c1, r1, c2, r2) {
  const keys = [];
  const dc = Math.sign(c2 - c1);
  const dr = Math.sign(r2 - r1);
  const steps = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1));

  for (let i = 0; i <= steps; i += 1) {
    keys.push(keyFor(c1 + dc * Math.min(i, Math.abs(c2 - c1)), r1 + dr * Math.min(i, Math.abs(r2 - r1))));
  }

  return keys;
}

function terrainHeightAt(c, r) {
  if (c < 7 && r < 7) return 1;
  if (c > 21 && r < 8) return 1;
  if (c > 23 && r > 15) return 1;
  if (c > 9 && c < 15 && r > 17) return 1;
  if ((c + r) % 11 === 0) return 1;
  return 0;
}

function buildTerrainMatrix() {
  return Array.from({ length: terrainHeight }, (_, r) => (
    Array.from({ length: terrainWidth }, (_, c) => {
      const key = keyFor(c, r);
      return {
        c,
        r,
        key,
        height: terrainHeightAt(c, r),
        kind: pits.has(key) ? "pit" : path.has(key) ? "path" : "sand",
        variant: (c * 17 + r * 31) % 5
      };
    })
  ));
}

function getTile(c, r) {
  return terrainMatrix[r]?.[c] ?? null;
}

function getAdjacency(tile) {
  const east = getTile(tile.c + 1, tile.r);
  const south = getTile(tile.c, tile.r + 1);
  return {
    sideEast: !east || east.height < tile.height,
    sideSouth: !south || south.height < tile.height,
    edgeEast: !east,
    edgeSouth: !south
  };
}

function project(c, r, height = 0) {
  return {
    x: originX + (c - r) * (tileW / 2),
    y: originY + (c + r) * (tileH / 2) - height * 18
  };
}

function drawDiamond(graphics, x, y, w, h, color, stroke = 0x000000, alpha = 1) {
  graphics.poly([x, y - h / 2, x + w / 2, y, x, y + h / 2, x - w / 2, y]);
  graphics.fill({ color, alpha });
  if (stroke !== null) graphics.stroke({ width: 1, color: stroke, alpha: 0.18 });
}

function tileColor(tile) {
  if (tile.kind === "pit") return 0x4e3b34;
  if (tile.kind === "path") return 0x79524a;
  return [0xc69a72, 0xd0a47a, 0xbd8d67, 0xc8996e, 0xcda178][tile.variant];
}

function sideColor(tile, side) {
  if (tile.kind === "path") return side === "east" ? 0x7d4e45 : 0x5f3c36;
  return side === "east" ? 0xb27550 : 0x8e5f43;
}

function drawTile(tile) {
  const pos = project(tile.c, tile.r, tile.height);
  const adjacency = getAdjacency(tile);
  const tileG = new Graphics();
  tileG.zIndex = Math.round((tile.c + tile.r) * 10);

  if (adjacency.sideEast) {
    tileG.poly([
      pos.x + tileW / 2, pos.y,
      pos.x, pos.y + tileH / 2,
      pos.x, pos.y + tileH / 2 + tileSideH,
      pos.x + tileW / 2, pos.y + tileSideH
    ]);
    tileG.fill({ color: sideColor(tile, "east") });
  }

  if (adjacency.sideSouth) {
    tileG.poly([
      pos.x - tileW / 2, pos.y,
      pos.x, pos.y + tileH / 2,
      pos.x, pos.y + tileH / 2 + tileSideH,
      pos.x - tileW / 2, pos.y + tileSideH
    ]);
    tileG.fill({ color: sideColor(tile, "south") });
  }

  drawDiamond(tileG, pos.x, pos.y, tileW, tileH, tileColor(tile));

  if (tile.kind === "pit") {
    tileG.ellipse(pos.x, pos.y, 23, 11).fill({ color: 0x372926, alpha: 0.9 });
  }

  world.addChild(tileG);
}

function renderWorld() {
  world.removeChildren();

  for (const row of terrainMatrix) {
    for (const tile of row) drawTile(tile);
  }
  world.pivot.set(fieldWidth / 2, fieldHeight / 2);
  world.position.set(fieldWidth / 2, fieldHeight / 2);
  world.sortChildren();
}

function updateCamera() {
  battlefield.style.transform = `translate(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px)) scale(${camera.scale})`;
}

function resetCamera() {
  Object.assign(camera, defaultCamera);
  updateCamera();
}

function zoomCamera(direction) {
  const zoomFactor = direction > 0 ? 1.16 : 0.86;
  camera.scale = Math.min(1.4, Math.max(0.28, camera.scale * zoomFactor));
  updateCamera();
}

function selectCard(index) {
  selectedCardIndex = index;
  blueprintCards.forEach((card, cardIndex) => {
    card.classList.toggle("selected", cardIndex === selectedCardIndex);
  });
}

function bumpWave() {
  wave = Math.min(wave + 1, 25);
  waveNumber.textContent = String(wave);
  waveTotal.textContent = "/25";
  alertIcon.classList.toggle("visible", wave >= 10);
  shell.classList.add("wave-pulse");
  setTimeout(() => shell.classList.remove("wave-pulse"), 550);
}

function setupInteractions() {
  window.getSelection()?.removeAllRanges();

  shell.addEventListener("pointerdown", (event) => {
    window.getSelection()?.removeAllRanges();
    if (event.target.closest("button, .blueprint-card")) return;
    isDragging = true;
    shell.setPointerCapture(event.pointerId);
    dragStart = { x: event.clientX, y: event.clientY };
    cameraStart = { x: camera.x, y: camera.y };
    shell.classList.add("is-panning");
  });

  shell.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    camera.x = cameraStart.x + event.clientX - dragStart.x;
    camera.y = cameraStart.y + event.clientY - dragStart.y;
    updateCamera();
  });

  shell.addEventListener("pointerup", () => {
    isDragging = false;
    shell.classList.remove("is-panning");
    window.getSelection()?.removeAllRanges();
  });

  shell.addEventListener("pointercancel", () => {
    isDragging = false;
    shell.classList.remove("is-panning");
  });

  shell.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomCamera(event.deltaY > 0 ? -1 : 1);
  }, { passive: false });

  homeButton.addEventListener("click", resetCamera);
  resetCameraButton.addEventListener("click", resetCamera);
  zoomOutButton.addEventListener("click", () => zoomCamera(-1));
  zoomInButton.addEventListener("click", () => zoomCamera(1));

  playButton.addEventListener("click", () => {
    fastForward = !fastForward;
    playButton.classList.toggle("active", fastForward);
    shell.classList.toggle("fast", fastForward);
  });

  gearButton.addEventListener("click", () => {
    shell.classList.toggle("settings-open");
  });

  sendWaveButton.addEventListener("click", bumpWave);

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      bumpWave();
    }
    if (event.key === "Escape") {
      resetCamera();
    }
  });

  blueprintCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      if (card.classList.contains("disabled")) return;
      selectCard(index);
    });
  });
}

async function boot() {
  app = new Application();
  await app.init({
    canvas,
    width: fieldWidth,
    height: fieldHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  });

  world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);
  renderWorld();
  selectCard(selectedCardIndex);
  setupInteractions();
  updateCamera();
  setTimeout(() => window.getSelection()?.removeAllRanges(), 0);
}

boot();
