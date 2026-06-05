import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Enter the Sanctum — Mystic Bulwark" }, { name: "description", content: "Sign in to save your arcane progress." }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/play" }); });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || "Apprentice" } },
        });
        if (error) throw error;
        toast.success("Check your scrying mirror (email) to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/play" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
    if (r.redirected) return;
    nav({ to: "/play" });
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0">
        <img src={heroImg} alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-background/60" />
      </div>
      <div className="parchment relative z-10 w-full max-w-md rounded-xl p-8">
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Sanctum</Link>
        <h1 className="mt-2 text-3xl text-gradient-gold">{mode === "signin" ? "Return, Adept" : "Take the Oath"}</h1>
        <div className="rune-divider my-4" />
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Sigil name" className="w-full rounded-md bg-input px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          )}
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-md bg-input px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-md bg-input px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          <button disabled={loading} className="w-full rounded-md bg-primary py-2 font-display text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {loading ? "…" : mode === "signin" ? "Enter" : "Forge Pact"}
          </button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
        <button onClick={google} className="w-full rounded-md border border-border bg-card py-2 hover:bg-secondary">Continue with Google</button>
        <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")} className="mt-4 w-full text-sm text-muted-foreground hover:text-primary">
          {mode === "signin" ? "New adept? Forge a pact." : "Already sworn? Sign in."}
        </button>
      </div>
    </main>
  );
}
