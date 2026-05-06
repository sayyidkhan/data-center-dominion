import type { GameState, Tower, Enemy, Projectile, Particle, Vec2 } from './types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, TOWER_DEFS, ENEMY_DEFS } from './constants';
import { distance } from './pathfinding';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  hoveredCell: { x: number; y: number } | null,
  time: number
) {
  const W = GRID_COLS * CELL_SIZE;
  const H = GRID_ROWS * CELL_SIZE;

  // Background
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);

  drawGrid(ctx, state, hoveredCell, time);
  drawPath(ctx, state, time);
  drawTowers(ctx, state, time);
  drawEnemies(ctx, state, time);
  drawProjectiles(ctx, state, time);
  drawParticles(ctx, state.particles);
  drawRangePreview(ctx, state, hoveredCell);
}

function drawGrid(ctx: CanvasRenderingContext2D, state: GameState, hoveredCell: { x: number; y: number } | null, time: number) {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = state.grid[row][col];
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      if (cell === 'path') continue;

      // Cell background
      const isHovered = hoveredCell && hoveredCell.x === col && hoveredCell.y === row;
      const canPlace = cell === 'empty' && state.selectedTowerType !== null;

      if (isHovered && canPlace) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.07)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const path = state.path;

  // Draw path segments
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (state.grid[row][col] === 'path') {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        // Base path
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Path lane
        ctx.fillStyle = '#0f2040';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }
    }
  }

  // Animated path arrows
  const arrowSpacing = CELL_SIZE * 1.5;
  const arrowOffset = (time * 60) % arrowSpacing;

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 8]);

  ctx.beginPath();
  if (path.length > 0) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/end markers
  if (path.length > 0) {
    // Start
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(path[0].x, path[0].y, 8, 0, Math.PI * 2);
    ctx.fill();

    // End
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN', path[0].x, path[0].y);
    ctx.fillText('OUT', path[path.length - 1].x, path[path.length - 1].y);
  }
}

function drawTowers(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  for (const tower of state.towers) {
    const def = TOWER_DEFS[tower.type];
    const isSelected = state.selectedTowerId === tower.id;
    const x = tower.x;
    const y = tower.y;

    ctx.save();
    ctx.translate(x, y);

    // Selection glow
    if (isSelected) {
      ctx.shadowColor = def.accentColor;
      ctx.shadowBlur = 20;
    }

    // Base platform
    ctx.fillStyle = '#1a2240';
    ctx.strokeStyle = isSelected ? def.accentColor : def.color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    roundedRect(ctx, -CELL_SIZE / 2 + 4, -CELL_SIZE / 2 + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
    ctx.fill();
    ctx.stroke();

    // Tower body (rotates to face target)
    ctx.rotate(tower.angle + Math.PI / 2);

    // Draw tower shape based on type
    drawTowerShape(ctx, tower.type, def.color, def.accentColor, tower.level, time);

    ctx.restore();

    // Level indicator dots
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
      // Barrel
      ctx.fillStyle = color;
      ctx.fillRect(-3, -18, 6, 22);
      ctx.fillStyle = accent;
      ctx.fillRect(-2, -20, 4, 6);
      // Body
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
      // Laser emitter
      ctx.fillStyle = color;
      ctx.fillRect(-2, -20, 4, 24);
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.fillRect(-1, -22, 2, 4);
      ctx.shadowBlur = 0;
      // Hex body
      ctx.fillStyle = color;
      hexagon(ctx, 0, 0, 8);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'frost': {
      // Frost crystal emitter
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
      // Body
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
      // Tesla coil
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
      // Body
      ctx.fillStyle = color;
      diamondShape(ctx, 0, 0, 9);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'missile': {
      // Missile launcher
      ctx.fillStyle = color;
      ctx.fillRect(-5, -16, 10, 18);
      // Missile
      ctx.fillStyle = accent;
      ctx.fillRect(-3, -20, 6, 10);
      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.moveTo(-3, -20);
      ctx.lineTo(3, -20);
      ctx.lineTo(0, -26);
      ctx.closePath();
      ctx.fill();
      // Body
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

    // Boss pulse
    if (enemy.isBoss) {
      const pulse = Math.sin(time * 3) * 0.2 + 1;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 20 * pulse;
    }

    // Enemy body
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
      // Boss: large diamond
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

      // Inner glow
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

    // Slow indicator
    if (enemy.slowFactor < 1) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // HP bar
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
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'laser_beam':
        ctx.fillStyle = proj.color;
        ctx.shadowBlur = 12;
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
        // Crystal spikes
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
        zigzag(ctx, 0, 0, proj.size * 3);
        break;
      case 'missile':
        ctx.fillStyle = proj.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
        ctx.fill();
        // Trail
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

function drawRangePreview(ctx: CanvasRenderingContext2D, state: GameState, hoveredCell: { x: number; y: number } | null) {
  // Hovered tower range
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

  // Placement preview range
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

    // Ghost tower
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = def.color;
    roundedRect(ctx, cx - CELL_SIZE / 2 + 4, cy - CELL_SIZE / 2 + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Helpers
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

function zigzag(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx - r / 2, cy - r / 2);
  ctx.lineTo(cx + r / 4, cy);
  ctx.lineTo(cx - r / 4, cy + r / 2);
  ctx.stroke();
}
