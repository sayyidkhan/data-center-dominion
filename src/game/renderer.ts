import type { GameState, Tower, Enemy, Projectile, Particle, Vec2 } from './types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, VIEWPORT_COLS, VIEWPORT_W, VIEWPORT_H, TOWER_DEFS, ENEMY_DEFS, PATH_WAYPOINTS } from './constants';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  hoveredCell: { x: number; y: number } | null,
  time: number
) {
  ctx.save();
  ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  // Background
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  // Translate by camera offset
  ctx.translate(-state.cameraX, 0);

  drawGrid(ctx, state, hoveredCell, state.cameraX, time);
  drawPath(ctx, state, time);
  drawCastle(ctx, state, time);
  drawSpawnPortal(ctx, state, time);
  drawTowers(ctx, state, time);
  drawEnemies(ctx, state, time);
  drawProjectiles(ctx, state, time);
  drawParticles(ctx, state.particles);
  drawRangePreview(ctx, state, hoveredCell, state.cameraX);

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

function drawCastle(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const S = CELL_SIZE;
  const pathEnd = state.path[state.path.length - 1];

  // Anchor: castle horizontally at col 3.5 (path end x), vertically so gate aligns with path end
  const kH_ref = S * 1.5;
  const gH_ref = S * 0.8;
  const cx = pathEnd.x;
  const cy = pathEnd.y - (kH_ref / 2 - gH_ref / 2);

  const pulse = Math.sin(time * 2) * 0.2 + 0.8;

  ctx.save();
  ctx.translate(cx, cy);

  // ---------- dimensions (all relative to cx,cy) ----------
  const kW = S * 1.2;   // keep width
  const kH = S * 1.5;   // keep height
  const kX = -kW / 2;
  const kY = -kH / 2;

  const tW = S * 0.4;   // side tower width
  const tH = S * 2.0;   // side tower height
  const tY = -tH / 2;

  const gW = S * 0.5;   // gate width
  const gH = S * 0.8;   // gate height
  const gX = -gW / 2;
  const gY = kY + kH - gH;   // gate sits at bottom of keep

  // ── Side towers ──
  for (const tx of [-kW / 2 - tW + 1, kW / 2 - 1]) {
    ctx.fillStyle = '#0f1c30';
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tx, tY, tW, tH);
    ctx.strokeRect(tx, tY, tW, tH);
    
    // arrow slit
    ctx.fillStyle = 'rgba(80,180,255,0.3)';
    ctx.fillRect(tx + tW * 0.4, tY + tH * 0.35, tW * 0.2, tH * 0.18);
    
    // battlements (2 merlons)
    const mW = tW / 3;
    const mH = S * 0.2;
    for (let m = 0; m < 2; m++) {
      ctx.fillStyle = '#0f1c30';
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1;
      ctx.fillRect(tx + m * mW * 2, tY - mH, mW, mH);
      ctx.strokeRect(tx + m * mW * 2, tY - mH, mW, mH);
    }
  }

  // ── Main keep ──
  ctx.fillStyle = '#132030';
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1.5;
  ctx.fillRect(kX, kY, kW, kH);
  ctx.strokeRect(kX, kY, kW, kH);
  
  // stone lines
  ctx.strokeStyle = 'rgba(201,162,39,0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(kX, kY + i * kH / 4); ctx.lineTo(kX + kW, kY + i * kH / 4); ctx.stroke();
  }
  
  // keep battlements (4 merlons)
  const kmW = kW / 7;
  const kmH = S * 0.2;
  for (let m = 0; m < 4; m++) {
    ctx.fillStyle = '#132030';
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1;
    ctx.fillRect(kX + m * kmW * 1.85, kY - kmH, kmW, kmH);
    ctx.strokeRect(kX + m * kmW * 1.85, kY - kmH, kmW, kmH);
  }
  
  // keep window
  ctx.fillStyle = 'rgba(80,180,255,0.25)';
  ctx.fillRect(-S * 0.1, kY + kH * 0.2, S * 0.2, S * 0.25);

  // ── Gate (front centre, bottom of keep) ──
  ctx.fillStyle = '#04080f';
  ctx.beginPath();
  ctx.arc(0, gY + gH * 0.4, gW / 2, Math.PI, 0);
  ctx.lineTo(gX + gW, gY + gH);
  ctx.lineTo(gX, gY + gH);
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, gY + gH * 0.4, gW / 2, Math.PI, 0);
  ctx.lineTo(gX + gW, gY + gH);
  ctx.moveTo(gX, gY + gH * 0.4);
  ctx.lineTo(gX, gY + gH);
  ctx.stroke();
  
  // portcullis bars
  ctx.strokeStyle = 'rgba(201,162,39,0.5)';
  ctx.lineWidth = 1;
  for (let b = 0; b <= 3; b++) {
    const bx = gX + b * (gW / 3);
    ctx.beginPath(); ctx.moveTo(bx, gY + gH * 0.4 - gW / 2 + 2); ctx.lineTo(bx, gY + gH); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(gX, gY + gH * 0.7); ctx.lineTo(gX + gW, gY + gH * 0.7); ctx.stroke();
  
  // gate glow
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 10 * pulse;
  ctx.fillStyle = `rgba(255,200,0,${0.2 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, gY + gH * 0.4, gW / 2, Math.PI, 0);
  ctx.lineTo(gX + gW, gY + gH);
  ctx.lineTo(gX, gY + gH);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Flags ──
  drawFlag(ctx, -kW / 2 - tW / 2, tY - S * 0.1, time, '#cc2200', 0.4);
  drawFlag(ctx,  kW / 2 + tW / 2, tY - S * 0.1, time, '#c9a227', 0.4);

  ctx.restore();
}


function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color: string, scale: number = 1) {
  const wave = Math.sin(time * 3) * 4 * scale;
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 20 * scale);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 20 * scale);
  ctx.quadraticCurveTo(x + 8 * scale + wave, y - 15 * scale, x + 14 * scale + wave, y - 13 * scale);
  ctx.quadraticCurveTo(x + 8 * scale + wave, y - 11 * scale, x, y - 10 * scale);
  ctx.closePath();
  ctx.fill();
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

    if (enemy.slowFactor < 1) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
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
    }

    ctx.shadowBlur = 0;
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

