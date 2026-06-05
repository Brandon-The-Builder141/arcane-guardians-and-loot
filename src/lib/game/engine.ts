import { TOWERS, ENEMIES, WAVES, PATH, SANCTUM, ABILITIES, type TowerDef, type EnemyDef, type AbilityId, type TowerStats, type MetaState } from "./content";

export interface Tower {
  id: number; def: TowerDef; x: number; y: number;
  level: number; xp: number; xpNeeded: number; pendingUpgrade: number; // 0=none, 1=tier1 pending, 2=tier2 pending
  stats: TowerStats; cooldown: number; totalKills: number; totalDamage: number; chosenUpgrades: number[];
}

export interface Enemy {
  id: number; def: EnemyDef; pathIdx: number; t: number; x: number; y: number;
  hp: number; maxHp: number; slowUntil: number; slowFactor: number; dot: { dps: number; until: number } | null;
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number; target: Enemy | null; tx: number; ty: number;
  damage: number; splash: number; color: string; alive: boolean; piercesLeft: number; hit: Set<number>;
  chain: number; sourceTowerId: number; element: string;
  dotDps: number; dotDuration: number; slowFactor: number; slowDuration: number;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }

export interface Ability { id: AbilityId; ready: number; }

export interface GameState {
  width: number; height: number; running: boolean; speed: number;
  gold: number; lives: number; maxLives: number; wave: number; waveActive: boolean;
  spawnQueue: { enemy: string; t: number }[]; spawnT: number;
  towers: Tower[]; enemies: Enemy[]; projectiles: Projectile[]; particles: Particle[];
  abilities: Ability[]; selectedAbility: AbilityId | null;
  hover: { x: number; y: number } | null;
  placing: TowerDef | null;
  selectedTowerId: number | null;
  status: "idle" | "playing" | "victory" | "defeat" | "between";
  time: number;
  meta: MetaState;
  globalDmgMul: number; globalRangeMul: number; cdMul: number; betweenWaveBonus: number;
  totalKilled: number; encountered: Set<string>;
  pathPixels: { x: number; y: number }[];
}

export interface InitOptions { width: number; height: number; meta: MetaState; }

const TILE_HIT_RADIUS = 36;

export function createState({ width, height, meta }: InitOptions): GameState {
  const pathPixels = PATH.map(([nx, ny]) => ({ x: nx * width, y: ny * height }));
  let gold = 200, maxLives = 20;
  let globalDmgMul = 1, globalRangeMul = 1, cdMul = 1, betweenWaveBonus = 0;
  for (const sId of meta.unlockedSkills) {
    if (sId === "gold1") gold += 50;
    if (sId === "gold2") gold += 100;
    if (sId === "life1") maxLives += 5;
    if (sId === "life2") maxLives += 10;
    if (sId === "dmg1") globalDmgMul *= 1.1;
    if (sId === "dmg2") globalDmgMul *= 1.2;
    if (sId === "range1") globalRangeMul *= 1.1;
    if (sId === "cd1") cdMul *= 0.75;
    if (sId === "interest") betweenWaveBonus += 5;
  }
  return {
    width, height, running: false, speed: 1,
    gold, lives: maxLives, maxLives, wave: 0, waveActive: false,
    spawnQueue: [], spawnT: 0,
    towers: [], enemies: [], projectiles: [], particles: [],
    abilities: ABILITIES.map(a => ({ id: a.id, ready: 0 })),
    selectedAbility: null, hover: null, placing: null, selectedTowerId: null,
    status: "idle", time: 0, meta,
    globalDmgMul, globalRangeMul, cdMul, betweenWaveBonus,
    totalKilled: 0, encountered: new Set(),
    pathPixels,
  };
}

let nextId = 1;
const newId = () => nextId++;

export function startWave(s: GameState) {
  if (s.waveActive || s.wave >= WAVES.length) return;
  s.wave += 1;
  const wave = WAVES[s.wave - 1];
  const queue: { enemy: string; t: number }[] = [];
  let t = 0;
  for (const sp of wave.spawns) {
    for (let i = 0; i < sp.count; i++) {
      queue.push({ enemy: sp.enemy, t });
      t += sp.interval;
    }
    t += 0.5;
  }
  // shuffle interleave for variety (sort by time)
  s.spawnQueue = queue.sort((a, b) => a.t - b.t);
  s.spawnT = 0;
  s.waveActive = true;
  s.status = "playing";
  s.running = true;
}

export function canPlace(s: GameState, x: number, y: number, ignoreId?: number): boolean {
  // not too close to path
  for (let i = 0; i < s.pathPixels.length - 1; i++) {
    const a = s.pathPixels[i], b = s.pathPixels[i + 1];
    if (distToSeg(x, y, a.x, a.y, b.x, b.y) < 36) return false;
  }
  // not overlapping another tower
  for (const t of s.towers) {
    if (t.id === ignoreId) continue;
    if (Math.hypot(t.x - x, t.y - y) < 40) return false;
  }
  if (x < 30 || y < 30 || x > s.width - 30 || y > s.height - 30) return false;
  return true;
}

export function placeTower(s: GameState, def: TowerDef, x: number, y: number): boolean {
  if (s.gold < def.cost) return false;
  if (!canPlace(s, x, y)) return false;
  s.gold -= def.cost;
  const stats: TowerStats = {
    damage: def.damage, range: def.range * s.globalRangeMul, fireRate: def.fireRate,
    splash: def.splash ?? 0, dotDps: def.dotDps ?? 0, dotDuration: def.dotDuration ?? 0,
    slowFactor: def.slow?.factor ?? 0, slowDuration: def.slow?.duration ?? 0,
    chain: 0, pierce: 0,
  };
  s.towers.push({
    id: newId(), def, x, y, level: 1, xp: 0, xpNeeded: 30, pendingUpgrade: 0,
    stats, cooldown: 0, totalKills: 0, totalDamage: 0, chosenUpgrades: [],
  });
  spawnParticles(s, x, y, def.color, 22);
  return true;
}

export function sellTower(s: GameState, id: number) {
  const t = s.towers.find(t => t.id === id); if (!t) return;
  const refund = Math.floor(t.def.cost * 0.6 + t.totalDamage * 0.02);
  s.gold += refund;
  s.towers = s.towers.filter(x => x.id !== id);
  s.selectedTowerId = null;
  spawnParticles(s, t.x, t.y, "#aaa", 18);
}

export function chooseUpgrade(s: GameState, towerId: number, choice: number) {
  const t = s.towers.find(t => t.id === towerId); if (!t || t.pendingUpgrade === 0) return;
  const tier = t.pendingUpgrade - 1;
  const up = t.def.upgrades[tier][choice]; if (!up) return;
  up.apply(t.stats);
  t.chosenUpgrades[tier] = choice;
  t.pendingUpgrade = 0;
}

export function castAbility(s: GameState, id: AbilityId, x?: number, y?: number) {
  const ab = s.abilities.find(a => a.id === id); if (!ab) return false;
  if (s.time < ab.ready) return false;
  const def = ABILITIES.find(d => d.id === id)!;
  if (id === "meteor") {
    if (x == null || y == null) return false;
    for (const e of s.enemies) {
      if (Math.hypot(e.x - x, e.y - y) < def.radius) {
        damageEnemy(s, e, def.damage * s.globalDmgMul, null, "arcane");
      }
    }
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2; const r = Math.random() * def.radius;
      s.particles.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: (Math.random() - .5) * 80, vy: -Math.random() * 120, life: 0.8, max: 0.8, color: def.color, size: 4 + Math.random() * 4 });
    }
  } else if (id === "freeze") {
    for (const e of s.enemies) { e.slowUntil = s.time + def.duration; e.slowFactor = def.slow; }
    for (let i = 0; i < 80; i++) {
      s.particles.push({ x: Math.random() * s.width, y: Math.random() * s.height, vx: 0, vy: -20, life: 1.2, max: 1.2, color: def.color, size: 2 + Math.random() * 3 });
    }
  } else if (id === "heal") {
    s.lives = Math.min(s.maxLives, s.lives + def.heal);
  }
  ab.ready = s.time + def.cooldown * s.cdMul;
  s.selectedAbility = null;
  return true;
}

function spawnParticles(s: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2; const sp = 30 + Math.random() * 80;
    s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, color, size: 2 + Math.random() * 3 });
  }
}

function damageEnemy(s: GameState, e: Enemy, dmg: number, src: Tower | null, _element: string) {
  e.hp -= dmg;
  if (src) src.totalDamage += dmg;
  if (e.hp <= 0) {
    e.hp = 0;
    s.gold += e.def.bounty;
    s.totalKilled++;
    if (src) {
      src.totalKills++;
      gainXp(s, src, e.def.bounty + 2);
    }
    spawnParticles(s, e.x, e.y, "#f5d774", 16);
  }
}

function gainXp(s: GameState, t: Tower, amt: number) {
  t.xp += amt;
  while (t.xp >= t.xpNeeded && t.level < 5) {
    t.xp -= t.xpNeeded;
    t.level += 1;
    t.xpNeeded = Math.floor(t.xpNeeded * 1.6 + 20);
    // Stat bumps
    t.stats.damage *= 1.12;
    t.stats.range *= 1.04;
    t.stats.fireRate *= 1.06;
    if (t.level === 2) t.pendingUpgrade = 1;
    if (t.level === 4) t.pendingUpgrade = 2;
    spawnParticles(s, t.x, t.y, "#fff5b0", 30);
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay; const len2 = dx * dx + dy * dy || 1;
  let tt = ((px - ax) * dx + (py - ay) * dy) / len2; tt = Math.max(0, Math.min(1, tt));
  const x = ax + dx * tt, y = ay + dy * tt;
  return Math.hypot(px - x, py - y);
}

export function step(s: GameState, dt: number) {
  if (!s.running) return;
  dt *= s.speed; s.time += dt;

  // spawn
  if (s.waveActive) {
    s.spawnT += dt;
    while (s.spawnQueue.length && s.spawnQueue[0].t <= s.spawnT) {
      const sp = s.spawnQueue.shift()!;
      const def = ENEMIES[sp.enemy]; if (!def) continue;
      const waveScale = 1 + (s.wave - 1) * 0.10;
      const hp = Math.floor(def.hp * waveScale);
      s.enemies.push({
        id: newId(), def, pathIdx: 0, t: 0,
        x: s.pathPixels[0].x, y: s.pathPixels[0].y,
        hp, maxHp: hp, slowUntil: 0, slowFactor: 0, dot: null,
      });
      s.encountered.add(def.id);
    }
  }

  // move enemies
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const speed = e.def.speed * (s.time < e.slowUntil ? 1 - e.slowFactor : 1);
    let remain = speed * dt;
    while (remain > 0 && e.pathIdx < s.pathPixels.length - 1) {
      const a = s.pathPixels[e.pathIdx], b = s.pathPixels[e.pathIdx + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const remSeg = segLen * (1 - e.t);
      if (remain < remSeg) {
        e.t += remain / segLen; remain = 0;
      } else {
        remain -= remSeg; e.pathIdx += 1; e.t = 0;
      }
    }
    if (e.pathIdx >= s.pathPixels.length - 1) {
      // reached sanctum
      s.lives -= e.def.damage;
      e.hp = -1;
      if (s.lives <= 0) { s.lives = 0; s.status = "defeat"; s.running = false; }
    } else {
      const a = s.pathPixels[e.pathIdx], b = s.pathPixels[e.pathIdx + 1];
      e.x = a.x + (b.x - a.x) * e.t;
      e.y = a.y + (b.y - a.y) * e.t;
    }
    if (e.dot && s.time < e.dot.until) {
      e.hp -= e.dot.dps * dt;
      if (e.hp <= 0) {
        s.gold += e.def.bounty; s.totalKilled++; e.hp = 0;
        spawnParticles(s, e.x, e.y, "#7ed957", 12);
      }
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);

  // tower fire
  for (const t of s.towers) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    // pick target: farthest along path within range
    let best: Enemy | null = null; let bestProg = -1;
    for (const e of s.enemies) {
      if (e.def.flying && !t.def.canHitFlying) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d > t.stats.range) continue;
      const prog = e.pathIdx + e.t;
      if (prog > bestProg) { bestProg = prog; best = e; }
    }
    if (!best) continue;
    fireProjectile(s, t, best);
    t.cooldown = 1 / t.stats.fireRate;
  }

  // projectiles
  for (const p of s.projectiles) {
    if (!p.alive) continue;
    if (p.target && p.target.hp > 0) {
      const dx = p.target.x - p.x, dy = p.target.y - p.y; const d = Math.hypot(dx, dy) || 1;
      const sp = Math.hypot(p.vx, p.vy);
      p.vx = dx / d * sp; p.vy = dy / d * sp;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // hit
    if (p.target && p.target.hp > 0 && Math.hypot(p.target.x - p.x, p.target.y - p.y) < 14) {
      hitProjectile(s, p, p.target);
    } else if (!p.target) {
      if (Math.hypot(p.x - p.tx, p.y - p.ty) < 10) {
        // ground splash
        applyProjImpact(s, p, p.x, p.y);
        p.alive = false;
      }
    }
    if (p.x < -50 || p.y < -50 || p.x > s.width + 50 || p.y > s.height + 50) p.alive = false;
  }
  s.projectiles = s.projectiles.filter(p => p.alive);

  // particles
  for (const pt of s.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; pt.vy += 80 * dt;
  }
  s.particles = s.particles.filter(p => p.life > 0);

  // end of wave
  if (s.waveActive && s.spawnQueue.length === 0 && s.enemies.length === 0) {
    s.waveActive = false;
    const wv = WAVES[s.wave - 1]; if (wv) s.gold += wv.reward + s.betweenWaveBonus;
    if (s.wave >= WAVES.length) { s.status = "victory"; s.running = false; }
    else s.status = "between";
  }
}

function fireProjectile(s: GameState, t: Tower, target: Enemy) {
  const dx = target.x - t.x, dy = target.y - t.y; const d = Math.hypot(dx, dy) || 1;
  const sp = t.def.projectileSpeed;
  const dmg = t.stats.damage * s.globalDmgMul;
  s.projectiles.push({
    x: t.x, y: t.y, vx: dx / d * sp, vy: dy / d * sp,
    target, tx: target.x, ty: target.y,
    damage: dmg, splash: t.stats.splash, color: t.def.color,
    alive: true, piercesLeft: t.stats.pierce, hit: new Set(),
    chain: t.stats.chain, sourceTowerId: t.id, element: t.def.element,
    dotDps: t.stats.dotDps, dotDuration: t.stats.dotDuration,
    slowFactor: t.stats.slowFactor, slowDuration: t.stats.slowDuration,
  });
}

function applyProjImpact(s: GameState, p: Projectile, x: number, y: number) {
  if (p.splash > 0) {
    for (const e of s.enemies) {
      if (Math.hypot(e.x - x, e.y - y) <= p.splash) {
        const src = s.towers.find(t => t.id === p.sourceTowerId) ?? null;
        damageEnemy(s, e, p.damage, src, p.element);
        if (p.dotDps > 0) e.dot = { dps: p.dotDps, until: s.time + p.dotDuration };
        if (p.slowFactor > 0) { e.slowUntil = s.time + p.slowDuration; e.slowFactor = p.slowFactor; }
      }
    }
    s.particles.push(...Array.from({ length: 18 }, () => {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, color: p.color, size: 3 + Math.random() * 3 };
    }));
  }
}

function hitProjectile(s: GameState, p: Projectile, target: Enemy) {
  const src = s.towers.find(t => t.id === p.sourceTowerId) ?? null;
  damageEnemy(s, target, p.damage, src, p.element);
  if (p.dotDps > 0) target.dot = { dps: p.dotDps, until: s.time + p.dotDuration };
  if (p.slowFactor > 0) { target.slowUntil = s.time + p.slowDuration; target.slowFactor = p.slowFactor; }
  p.hit.add(target.id);
  if (p.splash > 0) applyProjImpact(s, p, target.x, target.y);
  // chain lightning
  if (p.chain > 0) {
    let last = target;
    for (let i = 0; i < p.chain; i++) {
      const next = s.enemies.find(e => !p.hit.has(e.id) && e.hp > 0 && Math.hypot(e.x - last.x, e.y - last.y) < 130);
      if (!next) break;
      damageEnemy(s, next, p.damage * 0.5, src, p.element);
      p.hit.add(next.id);
      // particle arc
      for (let k = 0; k < 8; k++) {
        const tt = k / 8;
        s.particles.push({ x: last.x + (next.x - last.x) * tt, y: last.y + (next.y - last.y) * tt, vx: 0, vy: 0, life: 0.3, max: 0.3, color: "#aedcff", size: 3 });
      }
      last = next;
    }
  }
  if (p.piercesLeft > 0) { p.piercesLeft -= 1; }
  else { p.alive = false; }
}

export function computeShardsEarned(s: GameState): number {
  // 5 per wave cleared, +25 for victory, +floor(kills/10)
  const cleared = s.status === "victory" ? WAVES.length : Math.max(0, s.wave - (s.waveActive ? 1 : 0));
  return cleared * 5 + (s.status === "victory" ? 25 : 0) + Math.floor(s.totalKilled / 10);
}

export { TOWERS, WAVES, SANCTUM, ABILITIES };
