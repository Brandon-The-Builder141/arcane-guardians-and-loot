import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { getSave, saveMeta } from "@/lib/save.functions";
import { SKILL_TREE } from "@/lib/game/content";

export const Route = createFileRoute("/_authenticated/skill-tree")({
  head: () => ({ meta: [{ title: "Sanctum Tree — Mystic Bulwark" }, { name: "description", content: "Spend Arcane Shards to permanently strengthen your sanctum." }] }),
  component: SkillTreePage,
});

function SkillTreePage() {
  const fetchSave = useServerFn(getSave);
  const saveFn = useServerFn(saveMeta);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["save"], queryFn: () => fetchSave() });
  const [busy, setBusy] = useState(false);

  if (!data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Reading the codex…</div>;
  const unlocked = new Set(Object.keys(data.meta?.skillTree ?? {}));
  const shards = data.shards;

  async function unlock(id: string) {
    const node = SKILL_TREE.find(n => n.id === id)!;
    if (unlocked.has(id)) return;
    if (!node.deps.every(d => unlocked.has(d))) { toast.error("Earlier sigils must be lit first."); return; }
    if (shards < node.cost) { toast.error("Not enough shards."); return; }
    setBusy(true);
    const newTree = { ...(data?.meta?.skillTree ?? {}), [id]: true as const };
    try {
      await saveFn({ data: { meta: { skillTree: newTree, unlocks: data?.meta?.unlocks ?? [] }, shards: shards - node.cost } });
      qc.invalidateQueries({ queryKey: ["save"] });
      toast.success(`${node.name} sigil lit.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const cols = 4, rows = 3, cellW = 220, cellH = 170;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Sanctum</Link>
          <h1 className="mt-1 font-display text-4xl text-gradient-gold">Sanctum Tree</h1>
        </div>
        <div className="parchment flex items-center gap-2 rounded-md px-4 py-2">
          <Sparkles className="h-4 w-4 text-accent" /><span className="font-display text-2xl">{shards}</span><span className="text-xs uppercase tracking-widest text-muted-foreground">shards</span>
        </div>
      </div>
      <div className="rune-divider my-6" />
      <div className="parchment relative rounded-xl p-4" style={{ minHeight: rows * cellH + 40 }}>
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
          {SKILL_TREE.flatMap(n => n.deps.map(d => {
            const a = SKILL_TREE.find(x => x.id === d)!;
            const x1 = a.col * cellW + cellW / 2 + 16, y1 = a.row * cellH + cellH / 2 + 16;
            const x2 = n.col * cellW + cellW / 2 + 16, y2 = n.row * cellH + cellH / 2 + 16;
            const lit = unlocked.has(a.id) && unlocked.has(n.id);
            return <line key={`${d}-${n.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={lit ? "rgba(245,215,116,0.7)" : "rgba(245,215,116,0.18)"} strokeWidth={2} />;
          }))}
        </svg>
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cellW}px)`, gridTemplateRows: `repeat(${rows}, ${cellH}px)` }}>
          {SKILL_TREE.map(n => {
            const isUn = unlocked.has(n.id);
            const ready = n.deps.every(d => unlocked.has(d));
            return (
              <button key={n.id} disabled={busy || isUn || !ready || shards < n.cost} onClick={() => unlock(n.id)}
                style={{ gridColumn: n.col + 1, gridRow: n.row + 1 }}
                className={`m-2 flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  isUn ? "border-primary bg-primary/15 glow-gold" : ready ? "border-border bg-card hover:border-primary/60" : "border-border/40 bg-card/40 opacity-60"
                }`}>
                <div className="flex w-full items-center justify-between">
                  <span className="font-display text-sm">{n.name}</span>
                  <span className="flex items-center gap-1 text-xs text-accent"><Sparkles className="h-3 w-3" />{n.cost}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{n.desc}</p>
                {isUn && <div className="mt-auto pt-2 text-[10px] uppercase tracking-widest text-primary">Lit</div>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <Link to="/play" className="rounded-md bg-primary px-6 py-3 font-display text-primary-foreground glow-gold hover:opacity-90">To the Battlefield</Link>
      </div>
    </main>
  );
}
