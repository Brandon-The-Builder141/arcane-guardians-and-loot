import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import battlefield from "@/assets/battlefield-forest.jpg";
import { getSave, recordRun } from "@/lib/save.functions";
import { createState, step, startWave, placeTower, sellTower, chooseUpgrade, castAbility, canPlace, computeShardsEarned, type GameState, type Tower } from "@/lib/game/engine";
import { TOWERS, ENEMIES, ABILITIES, type TowerDef, type AbilityId, defaultMeta } from "@/lib/game/content";
import { TopBar } from "@/components/game/HUD";
import { Coins, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({ meta: [{ title: "The Enchanted Forest — Mystic Bulwark" }, { name: "description", content: "Defend the sanctum against painterly mystical hordes." }] }),
  component: PlayPage,
});

const WIDTH = 1280, HEIGHT = 720;

function PlayPage() {
  const fetchSave = useServerFn(getSave);
  const { data: save } = useQuery({ queryKey: ["save"], queryFn: () => fetchSave() });
  if (!save) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Lighting the sigils…</div>;
  const meta = { shards: save.shards, unlockedSkills: Object.keys(save.meta?.skillTree ?? {}), bestWave: 0 };
  return <Game meta={meta} />;
}

function Game({ meta }: { meta: ReturnType<typeof defaultMeta> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState({ width: WIDTH, height: HEIGHT, meta }));
  const [, force] = useState(0);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const nav = useNavigate();
  const recordRunFn = useServerFn(recordRun);
  const recordedRef = useRef(false);

  // Preload images
  useEffect(() => {
    const bg = new Image(); bg.src = battlefield; bg.onload = () => { bgRef.current = bg; force(x => x + 1); };
    const all = [...TOWERS.map(t => t.img), ...Object.values(ENEMIES).map(e => e.img)];
    all.forEach(src => {
      const i = new Image(); i.src = src; i.onload = () => { imgCache.current.set(src, i); force(x => x + 1); };
    });
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(stateRef.current, dt);
      render(canvasRef.current!, stateRef.current, bgRef.current, imgCache.current);
      force(x => (x + 1) & 0xffff);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // record run on end
  useEffect(() => {
    const s = stateRef.current;
    if (recordedRef.current) return;
    if (s.status === "victory" || s.status === "defeat") {
      recordedRef.current = true;
      const shardsEarned = computeShardsEarned(s);
      recordRunFn({ data: { mapId: "enchanted-forest", waveReached: s.wave, victory: s.status === "victory", shardsEarned } })
        .then(() => toast.success(`Earned ${shardsEarned} Arcane Shards.`))
        .catch(() => {});
    }
  });

  const s = stateRef.current;

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) * (WIDTH / r.width); const y = (e.clientY - r.top) * (HEIGHT / r.height);
    s.hover = { x, y };
  }
  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) * (WIDTH / r.width); const y = (e.clientY - r.top) * (HEIGHT / r.height);
    if (s.selectedAbility) {
      const ok = castAbility(s, s.selectedAbility, x, y);
      if (!ok) toast.error("Not ready.");
      return;
    }
    if (s.placing) {
      const ok = placeTower(s, s.placing, x, y);
      if (!ok) toast.error(s.gold < s.placing.cost ? "Not enough gold." : "Cannot place here.");
      else s.placing = null;
      return;
    }
    // select tower
    const t = s.towers.find(t => Math.hypot(t.x - x, t.y - y) < 26);
    s.selectedTowerId = t?.id ?? null;
  }
  function onContext(e: React.MouseEvent<HTMLCanvasElement>) { e.preventDefault(); s.placing = null; s.selectedAbility = null; }

  const selected = s.towers.find(t => t.id === s.selectedTowerId) ?? null;
  const upgradePending = s.towers.find(t => t.pendingUpgrade > 0);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 p-3">
      <TopBar
        s={s}
        onStartWave={() => startWave(s)}
        onTogglePause={() => { s.running = !s.running; if (s.status === "idle") s.status = "between"; }}
        onSpeed={(n) => { s.speed = n; }}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div className="parchment overflow-hidden rounded-xl p-2">
          <div className="relative">
            <canvas
              ref={canvasRef} width={WIDTH} height={HEIGHT}
              className="block h-auto w-full rounded-lg"
              style={{ aspectRatio: `${WIDTH}/${HEIGHT}`, cursor: s.placing || s.selectedAbility ? "crosshair" : "default" }}
              onMouseMove={onMouseMove}
              onMouseLeave={() => { s.hover = null; }}
              onClick={onClick}
              onContextMenu={onContext}
            />
            {s.status === "victory" || s.status === "defeat" ? <EndOverlay s={s} onHome={() => nav({ to: "/" })} onTree={() => nav({ to: "/skill-tree" })} /> : null}
          </div>
        </div>
        <aside className="flex flex-col gap-3">
          {upgradePending ? <UpgradePanel tower={upgradePending} onPick={(i) => chooseUpgrade(s, upgradePending.id, i)} /> : null}
          {selected ? <TowerPanel tower={selected} onSell={() => sellTower(s, selected.id)} /> : <TowerPicker s={s} onPick={(def) => { s.placing = def; s.selectedTowerId = null; }} placing={s.placing} />}
          <AbilityBar s={s} />
        </aside>
      </div>
    </div>
  );
}

function TowerPicker({ s, onPick, placing }: { s: GameState; onPick: (d: TowerDef) => void; placing: TowerDef | null }) {
  return (
    <div className="parchment rounded-xl p-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Summon Tower</div>
      <div className="grid grid-cols-2 gap-2">
        {TOWERS.map(t => {
          const can = s.gold >= t.cost;
          const active = placing?.id === t.id;
          return (
            <button key={t.id} onClick={() => onPick(t)} disabled={!can}
              className={`group relative overflow-hidden rounded-lg border p-2 text-left transition ${active ? "border-primary bg-primary/20" : "border-border hover:border-primary/60"} ${!can ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <img src={t.img} alt="" className="h-12 w-12 rounded object-contain" style={{ background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)` }} />
                <div className="min-w-0">
                  <div className="truncate font-display text-sm">{t.name}</div>
                  <div className="flex items-center gap-1 text-xs text-primary"><Coins className="h-3 w-3" />{t.cost}</div>
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.desc}</p>
            </button>
          );
        })}
      </div>
      {placing ? <div className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Click to place {placing.name} — Right-click to cancel.</div> : null}
    </div>
  );
}

function TowerPanel({ tower, onSell }: { tower: Tower; onSell: () => void }) {
  const xpPct = (tower.xp / tower.xpNeeded) * 100;
  return (
    <div className="parchment rounded-xl p-3">
      <div className="flex items-center gap-3">
        <img src={tower.def.img} alt="" className="h-16 w-16 rounded object-contain" style={{ background: `radial-gradient(circle, ${tower.def.glow} 0%, transparent 70%)` }} />
        <div>
          <div className="font-display text-lg">{tower.def.name}</div>
          <div className="text-xs text-muted-foreground">Level {tower.level} {tower.level < 5 ? `· ${Math.floor(tower.xp)}/${tower.xpNeeded} xp` : "· Max"}</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-input">
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, xpPct)}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Damage</dt><dd>{tower.stats.damage.toFixed(0)}</dd>
        <dt className="text-muted-foreground">Range</dt><dd>{tower.stats.range.toFixed(0)}</dd>
        <dt className="text-muted-foreground">Fire rate</dt><dd>{tower.stats.fireRate.toFixed(2)}/s</dd>
        <dt className="text-muted-foreground">Kills</dt><dd>{tower.totalKills}</dd>
      </dl>
      <button onClick={onSell} className="mt-3 w-full rounded-md border border-destructive/40 px-2 py-1 text-sm text-destructive hover:bg-destructive/10">Sell</button>
    </div>
  );
}

function UpgradePanel({ tower, onPick }: { tower: Tower; onPick: (i: number) => void }) {
  const tier = tower.pendingUpgrade - 1;
  return (
    <div className="parchment rounded-xl p-3 glow-arcane">
      <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /><div className="text-xs uppercase tracking-widest text-accent">{tower.def.name} ascends</div></div>
      <div className="space-y-2">
        {tower.def.upgrades[tier].map((u, i) => (
          <button key={i} onClick={() => onPick(i)} className="w-full rounded-md border border-accent/30 bg-accent/5 p-2 text-left hover:bg-accent/15">
            <div className="font-display text-sm">{u.name}</div>
            <div className="text-xs text-muted-foreground">{u.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AbilityBar({ s }: { s: GameState }) {
  return (
    <div className="parchment rounded-xl p-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Arcane Channels</div>
      <div className="grid grid-cols-3 gap-2">
        {ABILITIES.map(ab => {
          const a = s.abilities.find(x => x.id === ab.id)!;
          const cd = Math.max(0, a.ready - s.time);
          const ready = cd <= 0;
          const active = s.selectedAbility === ab.id;
          return (
            <button key={ab.id} onClick={() => {
              if (ab.id === "heal") castAbility(s, ab.id);
              else s.selectedAbility = active ? null : (ab.id as AbilityId);
            }} disabled={!ready}
              className={`relative overflow-hidden rounded-lg border p-2 text-left ${active ? "border-accent bg-accent/20" : "border-border"} ${!ready ? "opacity-60" : "hover:border-primary/60"}`}
              title={ab.desc}>
              <div className="font-display text-sm" style={{ color: ab.color }}>{ab.name}</div>
              <div className="text-[10px] text-muted-foreground line-clamp-2">{ab.desc}</div>
              {!ready ? <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />{cd.toFixed(1)}s</div> : <div className="mt-1 text-[11px] text-primary">Ready</div>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">Click Meteor or Hoarfrost, then click the battlefield. Mend Sanctum is instant.</div>
    </div>
  );
}

function EndOverlay({ s, onHome, onTree }: { s: GameState; onHome: () => void; onTree: () => void }) {
  const shards = computeShardsEarned(s);
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur">
      <div className="parchment rounded-xl p-8 text-center max-w-md">
        <h2 className="font-display text-4xl text-gradient-gold">{s.status === "victory" ? "The Sanctum Endures" : "The Sanctum Falls"}</h2>
        <p className="mt-2 text-muted-foreground">Wave {s.wave} · {s.totalKilled} slain</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-accent"><Sparkles className="h-5 w-5" /><span className="font-display text-2xl">+{shards}</span><span className="text-xs uppercase tracking-widest">Arcane Shards</span></div>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={onTree} className="rounded-md bg-accent px-4 py-2 text-accent-foreground">Spend in Sanctum Tree</button>
          <button onClick={onHome} className="rounded-md border border-border px-4 py-2">Return</button>
          <button onClick={() => window.location.reload()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Try again</button>
        </div>
      </div>
    </div>
  );
}

// ----- rendering -----
function render(canvas: HTMLCanvasElement, s: GameState, bg: HTMLImageElement | null, imgs: Map<string, HTMLImageElement>) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, s.width, s.height);
  if (bg) ctx.drawImage(bg, 0, 0, s.width, s.height);
  else { ctx.fillStyle = "#1a1f2e"; ctx.fillRect(0, 0, s.width, s.height); }

  // path glow overlay
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 200, 80, 0.10)"; ctx.lineWidth = 56;
  ctx.beginPath(); s.pathPixels.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  ctx.restore();

  // sanctum
  const last = s.pathPixels[s.pathPixels.length - 1];
  ctx.save();
  const gr = ctx.createRadialGradient(last.x, last.y, 8, last.x, last.y, 80);
  gr.addColorStop(0, "rgba(255,210,120,0.9)"); gr.addColorStop(1, "rgba(255,180,80,0)");
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(last.x, last.y, 80, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5d774"; ctx.beginPath(); ctx.arc(last.x, last.y, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // hover indicator
  if (s.hover && (s.placing || s.selectedAbility === "meteor")) {
    if (s.placing) {
      const ok = canPlace(s, s.hover.x, s.hover.y);
      ctx.strokeStyle = ok ? "rgba(122,217,140,0.9)" : "rgba(255,90,90,0.9)";
      ctx.fillStyle = ok ? "rgba(122,217,140,0.10)" : "rgba(255,90,90,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.hover.x, s.hover.y, (s.placing.range * s.globalRangeMul), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.hover.x, s.hover.y, 22, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeStyle = "#ff7a3a"; ctx.fillStyle = "rgba(255,122,58,0.18)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.hover.x, s.hover.y, 110, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  // tower range when selected
  const sel = s.towers.find(t => t.id === s.selectedTowerId);
  if (sel) {
    ctx.strokeStyle = "rgba(245,215,116,0.7)"; ctx.fillStyle = "rgba(245,215,116,0.08)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sel.x, sel.y, sel.stats.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // towers
  for (const t of s.towers) {
    const img = imgs.get(t.def.img);
    ctx.save();
    // base disc
    const g = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 36);
    g.addColorStop(0, t.def.glow); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(t.x, t.y, 36, 0, Math.PI * 2); ctx.fill();
    if (img) {
      const size = 56;
      ctx.drawImage(img, t.x - size / 2, t.y - size / 2 - 4, size, size);
    } else {
      ctx.fillStyle = t.def.color; ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.fill();
    }
    // level pips
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = "#f5d774"; ctx.beginPath(); ctx.arc(t.x - 18 + i * 9, t.y + 26, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    if (t.pendingUpgrade > 0) {
      ctx.strokeStyle = "#c89bff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, 30 + Math.sin(s.time * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // enemies
  for (const e of s.enemies) {
    const img = imgs.get(e.def.img);
    const baseY = e.y + (e.def.flying ? -10 - Math.sin(s.time * 4 + e.id) * 4 : 0);
    if (e.def.flying) {
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 12, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (img) {
      const size = 256 * e.def.scale;
      ctx.save();
      if (s.time < e.slowUntil) { ctx.filter = "hue-rotate(180deg) brightness(1.1)"; }
      ctx.drawImage(img, e.x - size / 2, baseY - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(e.x, baseY, 12, 0, Math.PI * 2); ctx.fill();
    }
    // hp bar
    const w = 36; const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(e.x - w / 2, baseY - 28, w, 4);
    ctx.fillStyle = pct > 0.5 ? "#7ed957" : pct > 0.25 ? "#f5d774" : "#ff6b6b";
    ctx.fillRect(e.x - w / 2, baseY - 28, w * pct, 4);
  }

  // projectiles
  for (const p of s.projectiles) {
    ctx.save();
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // particles
  for (const pt of s.particles) {
    const a = pt.life / pt.max;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // wave banner between waves
  if (s.status === "between" || s.status === "idle") {
    const next = s.wave;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, s.height / 2 - 50, s.width, 100);
    ctx.fillStyle = "#f5d774"; ctx.font = "600 28px 'Cinzel', serif"; ctx.textAlign = "center";
    const wave = next < 15 ? `Wave ${next + 1}: ${["Scouts at the Treeline","Orcish Probe","Restless Dead","Mixed Vanguard","Shadows Stir","Flight from the Cliffs","Troll Stomp","Wyvern Wing","Shadow Pact","The Iron Tide","Plague of the Forest","Sky and Earth","Necropolis Marches","Warband","The Wyrm Court"][next]}` : "All waves cleared";
    ctx.fillText(wave, s.width / 2, s.height / 2 + 4);
    ctx.fillStyle = "#fff"; ctx.font = "14px 'Spectral', serif"; ctx.fillText("Press Begin to summon the horde.", s.width / 2, s.height / 2 + 30);
    ctx.restore();
  }
}
// unused but keeps import for cohesion
void useSyncExternalStore;
