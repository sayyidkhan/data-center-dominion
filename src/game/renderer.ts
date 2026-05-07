import type { GameState, Tower, Particle, VisualEffect, Vec2, Hero } from './types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, VIEWPORT_COLS, VIEWPORT_W, VIEWPORT_H, TOWER_DEFS, ENEMY_DEFS } from './constants';
import { LASER_ACTIVE_MS } from './engine';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  hoveredCell: { x: number; y: number } | null,
  time: number
) {
  ctx.save();
  ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  if (state.phase === 'menu') {
    drawMenuBackdrop(ctx, time);
    ctx.restore();
    return;
  }

  // Background
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  // Translate by camera offset
  ctx.translate(-state.cameraX, 0);

  drawGrid(ctx, state, hoveredCell, state.cameraX, time);
  drawPath(ctx, state, time);
  drawDataCenter(ctx, state, time);
  drawSpawnPortal(ctx, state, time);
  drawTowers(ctx, state, time);
  drawHero(ctx, state.hero, time);
  drawEnemies(ctx, state, time);
  drawLaserBeams(ctx, state, time);
  drawProjectiles(ctx, state, time);
  drawEffects(ctx, state.effects, time);
  drawParticles(ctx, state.particles);
  drawRangePreview(ctx, state, hoveredCell, state.cameraX);

  ctx.restore();
}

/** Title screen only — crisp procedural backdrop instead of blurring the live map tiles. */
function drawMenuBackdrop(ctx: CanvasRenderingContext2D, time: number) {
  const w = VIEWPORT_W;
  const h = VIEWPORT_H;

  const base = ctx.createRadialGradient(w * 0.52, h * 0.22, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.95);
  base.addColorStop(0, '#122742');
  base.addColorStop(0.35, '#081426');
  base.addColorStop(1, '#03060e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.42, w * 0.72);
  glow.addColorStop(0, 'rgba(0, 212, 255, 0.14)');
  glow.addColorStop(0.45, 'rgba(0, 132, 255, 0.04)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.045)';
  ctx.lineWidth = 1;
  const step = 24;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  ctx.translate(w / 2, h * 0.62);
  ctx.scale(1, 0.42);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.035)';
  const gw = w * 0.95;
  const gh = h * 0.85;
  for (let i = -6; i <= 6; i++) {
    const ox = (i * gw) / 14 + Math.sin(time * 0.6 + i * 0.4) * 6;
    ctx.beginPath();
    ctx.moveTo(ox - gw / 2, -gh / 2);
    ctx.lineTo(ox + gw / 2, gh / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox - gw / 2, gh / 2);
    ctx.lineTo(ox + gw / 2, -gh / 2);
    ctx.stroke();
  }
  ctx.restore();

  const shimmer = (Math.sin(time * 1.1) * 0.5 + 0.5) * 0.06 + 0.04;
  const beam = ctx.createLinearGradient(0, h * 0.28, w, h * 0.72);
  beam.addColorStop(0, 'rgba(0, 212, 255, 0)');
  beam.addColorStop(0.48, `rgba(94, 203, 255, ${shimmer})`);
  beam.addColorStop(1, 'rgba(0, 212, 255, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 2, 8, 0.82)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawHero(ctx: CanvasRenderingContext2D, hero: Hero, time: number) {
  const walk = Math.sin(time * 12) * 1.5;

  ctx.save();
  ctx.translate(hero.targetX, hero.targetY);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
  ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, 10 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.rotate(hero.angle);

  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = hero.targetId ? 18 : 8;

  // Mobile defense mecha chassis.
  ctx.fillStyle = '#12243a';
  ctx.strokeStyle = '#5ecbff';
  ctx.lineWidth = 1.4;
  roundedRect(ctx, -11, -11, 22, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1b3656';
  roundedRect(ctx, -7, -7, 14, 14, 3);
  ctx.fill();

  ctx.fillStyle = '#64ffda';
  ctx.shadowColor = '#64ffda';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(3, -3, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = hero.targetId ? 12 : 4;
  ctx.strokeStyle = '#5ecbff';
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-4, side * 9);
    ctx.lineTo(-9 + walk * side, side * 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, side * 8);
    ctx.lineTo(12 - walk * side, side * 14);
    ctx.stroke();
  }

  // Front-mounted machine gun.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#263b52';
  roundedRect(ctx, 8, -5, 7, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#d8f3ff';
  roundedRect(ctx, 13, -2, 14, 4, 2);
  ctx.fill();
  if (hero.targetId) {
    ctx.fillStyle = `rgba(246, 196, 83, ${0.6 + Math.sin(time * 40) * 0.25})`;
    ctx.shadowColor = '#f6c453';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(29, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, hero.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, state: GameState, hoveredCell: { x: number; y: number } | null, cameraX: number, time: number) {
  // Only draw cols visible in viewport
  const startCol = Math.floor(cameraX / CELL_SIZE);
  const endCol = Math.min(startCol + VIEWPORT_COLS + 1, GRID_COLS);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = startCol; col < endCol; col++) {
      const cell = state.grid[row]?.[col];
      if (cell === 'path') continue;

      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      const isHovered = hoveredCell && hoveredCell.x === col && hoveredCell.y === row;
      const canPlace = cell === 'empty' && state.selectedTowerType !== null;

      if (isHovered && canPlace) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.07)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  // Draw path tiles
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (state.grid[row][col] === 'path') {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = '#0f2040';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }
    }
  }

  // Animated dashed center line
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 8]);
  ctx.lineDashOffset = -(time * 40 % 12);
  ctx.beginPath();
  const path = state.path;
  if (path.length > 0) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function drawDataCenter(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const S = CELL_SIZE;
  const pathEnd = state.path[state.path.length - 1];

  // Anchor the intake bay to the path end so enemy routing stays unchanged.
  const kH_ref = S * 1.5;
  const gH_ref = S * 0.8;
  const cx = pathEnd.x;
  const cy = pathEnd.y - (kH_ref / 2 - gH_ref / 2);

  const pulse = Math.sin(time * 2) * 0.2 + 0.8;

  ctx.save();
  ctx.translate(cx, cy);

  const w = S * 2.55;
  const h = S * 1.85;
  const x = -w / 2;
  const y = -h / 2;
  const bayW = S * 0.62;
  const bayH = S * 0.78;
  const bayX = -bayW / 2;
  const bayY = y + h - bayH;
  const parapetH = S * 0.22;

  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
  roundedRect(ctx, x - 8, y - 8, w + 16, h + 16, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#09131f';
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.fillRect(x, y, w, parapetH);
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y + parapetH);
  ctx.lineTo(x + w, y + parapetH);
  ctx.stroke();

  ctx.fillStyle = '#0e1b2c';
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
  for (let i = 0; i < 5; i++) {
    const colX = x + S * 0.18 + i * S * 0.43;
    roundedRect(ctx, colX, y + S * 0.36, S * 0.3, S * 0.72, 2);
    ctx.fill();
    ctx.stroke();

    for (let row = 0; row < 5; row++) {
      const slotY = y + S * 0.42 + row * S * 0.12;
      ctx.fillStyle = 'rgba(2, 8, 14, 0.85)';
      ctx.fillRect(colX + 4, slotY, S * 0.3 - 8, 3);
      ctx.fillStyle = (i + row) % 3 === 0 ? '#6aff9a' : '#5ecbff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 5 * pulse;
      ctx.beginPath();
      ctx.arc(colX + S * 0.24, slotY + 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  ctx.fillStyle = '#162234';
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.45)';
  for (let i = 0; i < 6; i++) {
    const windowX = x + S * 0.18 + i * S * 0.36;
    const windowY = y + S * 1.22;
    ctx.fillRect(windowX, windowY, S * 0.18, S * 0.16);
    ctx.strokeRect(windowX, windowY, S * 0.18, S * 0.16);
    if (i % 2 === 0) {
      ctx.fillStyle = `rgba(100, 255, 218, ${0.22 + 0.16 * pulse})`;
      ctx.fillRect(windowX + 2, windowY + 2, S * 0.18 - 4, S * 0.16 - 4);
      ctx.fillStyle = '#162234';
    }
  }

  ctx.fillStyle = '#0a101a';
  ctx.strokeStyle = '#6bdcff';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, bayX, bayY, bayW, bayH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 14 * pulse;
  ctx.fillStyle = `rgba(0, 212, 255, ${0.16 + 0.12 * pulse})`;
  roundedRect(ctx, bayX + 5, bayY + 5, bayW - 10, bayH - 10, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(128, 222, 234, 0.7)';
  ctx.lineWidth = 1;
  for (let b = 1; b < 4; b++) {
    const bx = bayX + b * (bayW / 4);
    ctx.beginPath();
    ctx.moveTo(bx, bayY + 7);
    ctx.lineTo(bx, bayY + bayH - 7);
    ctx.stroke();
  }

  ctx.fillStyle = '#64ffda';
  ctx.shadowColor = '#64ffda';
  ctx.shadowBlur = 8 * pulse;
  ctx.beginPath();
  ctx.arc(bayX + bayW / 2, bayY + bayH * 0.68, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#4fc3f7';
  for (let i = 0; i < 3; i++) {
    const ventX = x + S * 0.22 + i * S * 0.82;
    roundedRect(ctx, ventX, y - S * 0.16, S * 0.44, S * 0.18, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(128, 222, 234, 0.45)';
    for (let line = 0; line < 3; line++) {
      ctx.beginPath();
      ctx.moveTo(ventX + 5, y - S * 0.13 + line * 4);
      ctx.lineTo(ventX + S * 0.42 - 5, y - S * 0.13 + line * 4);
      ctx.stroke();
    }
    ctx.strokeStyle = '#4fc3f7';
  }

  ctx.strokeStyle = 'rgba(107, 220, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + S * 0.18, y + h - S * 0.18);
  ctx.lineTo(x + w - S * 0.18, y + h - S * 0.18);
  ctx.stroke();

  ctx.strokeStyle = '#6bdcff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, y - S * 0.18);
  ctx.lineTo(0, y - S * 0.52);
  ctx.stroke();

  for (let ring = 0; ring < 2; ring++) {
    ctx.strokeStyle = `rgba(0, 212, 255, ${(0.45 - ring * 0.18) * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, y - S * 0.52, S * (0.18 + ring * 0.12), Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  ctx.fillStyle = '#64ffda';
  ctx.shadowColor = '#64ffda';
  ctx.shadowBlur = 7 * pulse;
  ctx.beginPath();
  ctx.arc(0, y - S * 0.52, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawSpawnPortal(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const path = state.path;
  if (path.length === 0) return;
  const start = path[0];

  ctx.save();
  ctx.translate(start.x, start.y);

  const pulse = Math.sin(time * 4) * 0.3 + 0.7;

  // Outer ring
  ctx.strokeStyle = `rgba(255, 68, 68, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 16 * pulse;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Inner fill
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
  grad.addColorStop(0, `rgba(180, 0, 0, ${0.7 * pulse})`);
  grad.addColorStop(1, 'rgba(80, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // Rotating rune marks
  ctx.strokeStyle = `rgba(255, 100, 100, ${0.6 * pulse})`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // "SPAWN" label
  ctx.fillStyle = '#ff6666';
  ctx.font = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SPAWN', 0, 20);

  ctx.restore();
}

function drawTowers(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  for (const tower of state.towers) {
    const def = TOWER_DEFS[tower.type];
    const isSelected = state.selectedTowerId === tower.id;
    const x = tower.x;
    const y = tower.y;

    ctx.save();
    ctx.translate(x, y);

    if (isSelected) {
      ctx.shadowColor = def.accentColor;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = '#1a2240';
    ctx.strokeStyle = isSelected ? def.accentColor : def.color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    roundedRect(ctx, -CELL_SIZE / 2 + 4, -CELL_SIZE / 2 + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(tower.angle + Math.PI / 2);
    drawTowerShape(ctx, tower.type, def.color, def.accentColor, tower.level, time);
    ctx.restore();

    // Level dots
    ctx.save();
    ctx.translate(x, y);
    for (let l = 0; l < tower.level; l++) {
      ctx.fillStyle = def.accentColor;
      ctx.shadowColor = def.accentColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(-6 + l * 6, CELL_SIZE / 2 - 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawTowerShape(ctx: CanvasRenderingContext2D, type: Tower['type'], color: string, accent: string, level: number, time: number) {
  const scale = 0.9 + (level - 1) * 0.08;
  ctx.scale(scale, scale);

  switch (type) {
    case 'cannon': {
      ctx.fillStyle = color;
      ctx.fillRect(-3, -18, 6, 22);
      ctx.fillStyle = accent;
      ctx.fillRect(-2, -20, 4, 6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'laser': {
      ctx.fillStyle = color;
      ctx.fillRect(-2, -20, 4, 24);
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.fillRect(-1, -22, 2, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      hexagon(ctx, 0, 0, 8);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'frost': {
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.fillRect(-1, -20, 2, 12);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'tesla': {
      const flicker = Math.sin(time * 20) * 0.3 + 0.7;
      ctx.fillStyle = color;
      ctx.fillRect(-3, -18, 6, 20);
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12 * flicker;
      ctx.globalAlpha = flicker;
      ctx.beginPath();
      ctx.arc(0, -18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      diamondShape(ctx, 0, 0, 9);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'missile': {
      ctx.fillStyle = color;
      ctx.fillRect(-5, -16, 10, 18);
      ctx.fillStyle = accent;
      ctx.fillRect(-3, -20, 6, 10);
      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.moveTo(-3, -20);
      ctx.lineTo(3, -20);
      ctx.lineTo(0, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      roundedRect(ctx, -9, -5, 18, 10, 3);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  for (const enemy of state.enemies) {
    const def = ENEMY_DEFS[enemy.type];
    const x = enemy.x;
    const y = enemy.y;
    const r = def.size;

    ctx.save();
    ctx.translate(x, y);

    if (enemy.isBoss) {
      const pulse = Math.sin(time * 3) * 0.2 + 1;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 20 * pulse;
    }

    ctx.fillStyle = def.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    if (enemy.type === 'tank') {
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    } else if (enemy.type === 'swarm') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (enemy.type === 'boss') {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff9900';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,100,0,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    if (enemy.frozenTimer > 0) {
      ctx.strokeStyle = 'rgba(178, 235, 242, 0.95)';
      ctx.shadowColor = '#80deea';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#80deea';
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    } else if (enemy.slowFactor < 1) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (enemy.armorBreakTimer > 0 || enemy.exposedTimer > 0) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);

      if (enemy.armorBreakTimer > 0) {
        ctx.strokeStyle = 'rgba(255, 171, 64, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.exposedTimer > 0) {
        ctx.strokeStyle = 'rgba(100, 181, 246, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    const hpPct = enemy.hp / enemy.maxHp;
    const barW = r * 2 + 4;
    const barH = 3;
    const barY = -r - 7;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  for (const proj of state.projectiles) {
    const target = state.enemies.find(e => e.id === proj.targetId);
    const angle = target ? Math.atan2(target.y - proj.y, target.x - proj.x) : 0;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 8;

    switch (proj.type) {
      case 'bullet':
      case 'laser_beam':
        ctx.fillStyle = proj.color;
        ctx.shadowBlur = proj.type === 'laser_beam' ? 12 : 8;
        ctx.beginPath();
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'frost_bolt':
        ctx.fillStyle = '#80deea';
        ctx.shadowColor = '#80deea';
        ctx.beginPath();
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b2ebf2';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 2 + time * 3);
          ctx.beginPath();
          ctx.moveTo(0, -proj.size);
          ctx.lineTo(0, -proj.size - 4);
          ctx.stroke();
          ctx.restore();
        }
        break;
      case 'lightning':
        ctx.strokeStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-proj.size * 1.5, -proj.size * 1.5);
        ctx.lineTo(proj.size * 0.5, 0);
        ctx.lineTo(-proj.size * 0.5, proj.size * 0.5);
        ctx.lineTo(proj.size * 1.5, proj.size * 1.5);
        ctx.stroke();
        break;
      case 'missile':
        ctx.fillStyle = proj.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, proj.size * 1.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'machine_round':
        ctx.rotate(angle);
        ctx.shadowColor = '#f6c453';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#f6c453';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.fillStyle = '#fff4ba';
        ctx.beginPath();
        ctx.arc(9, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawLaserBeams(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  for (const tower of state.towers) {
    if (tower.type !== 'laser' || !tower.beamTargetId) continue;

    const target = state.enemies.find(e => e.id === tower.beamTargetId);
    if (!target) continue;

    const def = TOWER_DEFS[tower.type];
    const cycleMs = tower.laserCycleMs ?? 0;
    if (cycleMs >= LASER_ACTIVE_MS) continue;

    const rampIn = Math.min(1, cycleMs / 320);
    const rampOut = Math.min(1, (LASER_ACTIVE_MS - cycleMs) / 320);
    const ease = (t: number) => t * t * (3 - 2 * t);
    const intensity = ease(Math.max(0, Math.min(rampIn, rampOut)));
    const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    const startX = tower.x + Math.cos(angle) * 18;
    const startY = tower.y + Math.sin(angle) * 18;
    const endX = target.x;
    const endY = target.y;
    const pulse = 0.82 + Math.sin(time * 34 + tower.gridX) * 0.18;
    const flicker = 0.75 + Math.sin(time * 76 + tower.gridY) * 0.25;

    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 24 * pulse;
    ctx.lineWidth = 12 + tower.level * 2;
    ctx.globalAlpha = intensity * 0.18;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.globalAlpha = intensity * 0.45;
    ctx.strokeStyle = def.accentColor;
    ctx.shadowBlur = 18 * pulse;
    ctx.lineWidth = 6 + tower.level;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.globalAlpha = intensity * (0.82 + flicker * 0.18);
    ctx.strokeStyle = '#f5d5ff';
    ctx.shadowColor = '#f5d5ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.2 + tower.level * 0.35;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.globalAlpha = intensity * 0.55;
    ctx.fillStyle = '#f5d5ff';
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(endX, endY, 5 + Math.sin(time * 22) * 1.5, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      const travel = (time * 2.4 + i / 3) % 1;
      const sparkX = startX + (endX - startX) * travel;
      const sparkY = startY + (endY - startY) * travel;
      ctx.globalAlpha = intensity * (1 - travel) * 0.65;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.5 + tower.level * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, effects: VisualEffect[], time: number) {
  for (const effect of effects) {
    if (effect.type === 'lightning_zap') {
      const fade = effect.life / effect.maxLife;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < effect.points.length - 1; i++) {
        const from = effect.points[i];
        const to = effect.points[i + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const segments = Math.max(3, Math.ceil(len / 22));
        const jagged: Vec2[] = [from];

        for (let step = 1; step < segments; step++) {
          const t = step / segments;
          const wobble = (Math.random() - 0.5) * 18;
          jagged.push({
            x: from.x + dx * t + nx * wobble,
            y: from.y + dy * t + ny * wobble,
          });
        }
        jagged.push(to);

        ctx.globalAlpha = fade * (0.36 - i * 0.04);
        ctx.strokeStyle = '#fff59d';
        ctx.shadowColor = '#ffee58';
        ctx.shadowBlur = 24;
        ctx.lineWidth = 9;
        ctx.beginPath();
        jagged.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        ctx.globalAlpha = fade * (0.76 - i * 0.08);
        ctx.strokeStyle = '#ffee58';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 4;
        ctx.beginPath();
        jagged.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        jagged.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        ctx.globalAlpha = fade * 0.75;
        ctx.fillStyle = '#fffde7';
        ctx.shadowColor = '#ffee58';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(to.x, to.y, 5 - i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      continue;
    }

    if (effect.type !== 'frost_blast') continue;

    const progress = 1 - effect.life / effect.maxLife;
    const fade = effect.life / effect.maxLife;
    const eased = 1 - Math.pow(1 - progress, 3);
    const radius = effect.radius * eased;

    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    haze.addColorStop(0, `rgba(224, 247, 250, ${0.24 * fade})`);
    haze.addColorStop(0.48, `rgba(128, 222, 234, ${0.12 * fade})`);
    haze.addColorStop(1, 'rgba(128, 222, 234, 0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(178, 235, 242, ${0.86 * fade})`;
    ctx.shadowColor = '#80deea';
    ctx.shadowBlur = 18 * fade;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * fade})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -time * 42;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + time * 0.6;
      const inner = radius * 0.24;
      const outer = radius * (0.54 + 0.08 * Math.sin(time * 8 + i));
      ctx.strokeStyle = `rgba(224, 247, 250, ${0.42 * fade})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawRangePreview(ctx: CanvasRenderingContext2D, state: GameState, hoveredCell: { x: number; y: number } | null, cameraX: number) {
  if (state.selectedTowerId) {
    const tower = state.towers.find(t => t.id === state.selectedTowerId);
    if (tower) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (hoveredCell && state.selectedTowerType) {
    const def = TOWER_DEFS[state.selectedTowerType];
    const cx = hoveredCell.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = hoveredCell.y * CELL_SIZE + CELL_SIZE / 2;
    const range = def.range * CELL_SIZE;
    const canPlace = state.grid[hoveredCell.y]?.[hoveredCell.x] === 'empty';

    ctx.strokeStyle = canPlace ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 68, 68, 0.5)';
    ctx.fillStyle = canPlace ? 'rgba(0, 255, 136, 0.06)' : 'rgba(255, 68, 68, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = def.color;
    roundedRect(ctx, cx - CELL_SIZE / 2 + 4, cy - CELL_SIZE / 2 + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---- Shape helpers ----
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function hexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function diamondShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}
