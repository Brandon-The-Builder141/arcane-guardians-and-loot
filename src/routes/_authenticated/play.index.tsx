import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MAP_LIST } from "@/lib/game/content";
import { getSave } from "@/lib/save.functions";
import { Sparkles, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play/")({
  head: () => ({ meta: [
    { title: "Choose your battlefield — Mystic Bulwark" },
    { name: "description", content: "Pick a mystical battlefield: the Enchanted Forest or the Frozen Wastes." },
  ] }),
  component: MapSelect,
});

function MapSelect() {
  const fetchSave = useServerFn(getSave);
  const { data: save } = useQuery({ queryKey: ["save"], queryFn: () => fetchSave() });
  const nav = useNavigate();
  const shards = save?.shards ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Sanctum</Link>
      <div className="mt-1 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-5xl text-gradient-gold">Choose your battlefield</h1>
        <div className="flex items-center gap-1 text-accent"><Sparkles className="h-4 w-4" /><span className="font-display text-xl">{shards}</span><span className="text-xs uppercase tracking-widest text-muted-foreground">shards</span></div>
      </div>
      <div className="rune-divider my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        {MAP_LIST.map(m => {
          const locked = shards < m.unlockShards;
          return (
            <article key={m.id} className={`parchment overflow-hidden rounded-xl transition ${locked ? "opacity-70" : "hover:scale-[1.01]"}`}>
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={m.bg} alt={m.name} className="h-full w-full object-cover" loading="lazy" width={1280} height={720} />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                {locked ? <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm"><Lock className="h-10 w-10 text-primary" /></div> : null}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-xs uppercase tracking-widest text-primary">{m.subtitle}</div>
                  <div className="font-display text-3xl text-gradient-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{m.name}</div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{m.desc}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Difficulty</span>
                    <span className="ml-1">{"◆".repeat(m.difficulty)}<span className="text-muted-foreground/40">{"◆".repeat(5 - m.difficulty)}</span></span>
                  </div>
                  <div className="text-muted-foreground">{m.waves.length} waves</div>
                </div>
                <button
                  onClick={() => nav({ to: "/play/$mapId", params: { mapId: m.id } })}
                  disabled={locked}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:bg-input disabled:text-muted-foreground"
                >
                  {locked ? <>Locked · Need {m.unlockShards} shards</> : <>Begin <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
