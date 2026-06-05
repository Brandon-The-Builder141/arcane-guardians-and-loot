import { createFileRoute, Link } from "@tanstack/react-router";
import { TOWERS, ENEMIES } from "@/lib/game/content";

export const Route = createFileRoute("/codex")({
  head: () => ({ meta: [
    { title: "Bestiary & Codex — Mystic Bulwark" },
    { name: "description", content: "Learn about the towers and creatures of the Mystic Bulwark." },
    { property: "og:title", content: "Bestiary — Mystic Bulwark" },
    { property: "og:description", content: "Painterly mystical tower defense: bestiary of creatures and towers." },
  ] }),
  component: CodexPage,
});

function CodexPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Sanctum</Link>
      <h1 className="mt-1 font-display text-5xl text-gradient-gold">Bestiary & Codex</h1>
      <div className="rune-divider my-6" />

      <section>
        <h2 className="font-display text-2xl">Towers of the Sanctum</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TOWERS.map(t => (
            <article key={t.id} className="parchment flex gap-4 rounded-xl p-4">
              <img src={t.img} alt={t.name} className="h-32 w-32 flex-shrink-0 rounded object-contain" style={{ background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)` }} />
              <div>
                <h3 className="font-display text-xl">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
                  <dt className="text-muted-foreground">Cost</dt><dd>{t.cost} gold</dd>
                  <dt className="text-muted-foreground">Damage</dt><dd>{t.damage}</dd>
                  <dt className="text-muted-foreground">Range</dt><dd>{t.range}</dd>
                  <dt className="text-muted-foreground">Rate</dt><dd>{t.fireRate.toFixed(2)}/s</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Creatures of the Horde</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Object.values(ENEMIES).map(e => (
            <article key={e.id} className="parchment flex flex-col items-center rounded-xl p-4 text-center">
              <img src={e.img} alt={e.name} className="h-32 w-32 object-contain" />
              <h3 className="mt-2 font-display text-lg">{e.name}</h3>
              <p className="text-xs text-muted-foreground">HP {e.hp} · Spd {e.speed}{e.flying ? " · Flies" : ""}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
