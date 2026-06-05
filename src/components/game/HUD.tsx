import { Heart, Coins, Sparkles, Hourglass, Pause, Play, FastForward, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { WAVES } from "@/lib/game/content";
import type { GameState } from "@/lib/game/engine";

interface Props {
  s: GameState;
  onStartWave: () => void;
  onTogglePause: () => void;
  onSpeed: (n: number) => void;
}

export function TopBar({ s, onStartWave, onTogglePause, onSpeed }: Props) {
  return (
    <div className="parchment flex flex-wrap items-center gap-3 rounded-xl px-4 py-2 text-sm">
      <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><LogOut className="h-3 w-3" /> Sanctum</Link>
      <div className="h-6 w-px bg-border" />
      <div className="flex items-center gap-1.5 text-destructive"><Heart className="h-4 w-4 fill-current" /><span className="font-display text-lg">{s.lives}</span><span className="text-xs text-muted-foreground">/{s.maxLives}</span></div>
      <div className="flex items-center gap-1.5 text-primary"><Coins className="h-4 w-4" /><span className="font-display text-lg">{s.gold}</span></div>
      <div className="flex items-center gap-1.5 text-accent"><Sparkles className="h-4 w-4" /><span className="font-display text-lg">{s.totalKilled}</span><span className="text-xs text-muted-foreground">slain</span></div>
      <div className="ml-auto flex items-center gap-2">
        <div className="text-xs text-muted-foreground">Wave</div>
        <div className="font-display text-xl text-gradient-gold">{s.wave}/{WAVES.length}</div>
        {!s.waveActive && s.status !== "victory" && s.status !== "defeat" ? (
          <button onClick={onStartWave} className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90 glow-gold">
            <span className="flex items-center gap-1"><Hourglass className="h-3 w-3" /> {s.wave === 0 ? "Begin" : "Next wave"}</span>
          </button>
        ) : null}
        <button onClick={onTogglePause} className="rounded-md border border-border px-2 py-1.5 hover:bg-secondary" title="Pause">
          {s.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => onSpeed(n)} className={`rounded-md border px-2 py-1.5 text-xs ${s.speed === n ? "border-primary bg-primary/20 text-primary" : "border-border hover:bg-secondary"}`}>
            {n === 1 ? "1×" : <span className="flex items-center gap-1"><FastForward className="h-3 w-3" />{n}×</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
