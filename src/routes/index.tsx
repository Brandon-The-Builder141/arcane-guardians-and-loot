import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mystic Bulwark — Mystical Tower Defense" },
      { name: "description", content: "Painterly mystical tower defense. Summon wizards, druids, and golems to hold the sanctum against dragons, orcs, and the restless dead." },
      { property: "og:title", content: "Mystic Bulwark — Mystical Tower Defense" },
      { property: "og:description", content: "Painterly mystical tower defense with wizards, druids, dragons, and a deep arcane skill tree." },
      { property: "og:image", content: heroImg },
      { property: "twitter:image", content: heroImg },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="" className="h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary float-glow">A Sanctum Besieged</p>
        <h1 className="font-display text-6xl md:text-8xl leading-[0.9] text-gradient-gold drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
          Mystic Bulwark
        </h1>
        <div className="rune-divider my-6 w-48" />
        <p className="max-w-2xl text-lg text-foreground/80">
          Summon wizards, druids, elven archers, and stone golems. Hurl meteors. Channel hoarfrost.
          Hold the line against orcs, the restless dead, shadow beasts, and crimson wyverns.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/play" className="group rounded-md bg-primary px-8 py-4 text-lg font-display text-primary-foreground glow-gold hover:scale-[1.03] transition-transform">
            Begin the Vigil
          </Link>
          <Link to="/codex" className="rounded-md border border-primary/40 px-6 py-4 font-display text-foreground/90 hover:bg-primary/10">
            Bestiary
          </Link>
          <Link to="/skill-tree" className="rounded-md border border-accent/50 px-6 py-4 font-display text-foreground/90 hover:bg-accent/10">
            Sanctum Tree
          </Link>
        </div>
        <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["2", "Realms"],
            ["7", "Tower Types"],
            ["12", "Creatures"],
            ["3", "Abilities"],
          ].map(([n, l]) => (
            <div key={l} className="parchment rounded-lg p-4">
              <div className="text-3xl text-gradient-gold">{n}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
