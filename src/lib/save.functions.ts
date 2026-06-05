import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSave = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: save }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("save_states").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      profile: profile ?? null,
      meta: (save?.meta as { skillTree?: Record<string, true>; unlocks?: string[] } | null) ?? { skillTree: {}, unlocks: [] },
      shards: profile?.shards ?? 0,
    };
  });

const MetaSchema = z.object({
  skillTree: z.record(z.string().min(1).max(64), z.literal(true)).default({}),
  unlocks: z.array(z.string().min(1).max(64)).max(64).default([]),
});

export const saveMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { meta: unknown; shards?: number }) => ({
    meta: MetaSchema.parse(d.meta),
    shards: typeof d.shards === "number" ? Math.max(0, Math.floor(d.shards)) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("save_states").upsert({ user_id: userId, meta: data.meta }, { onConflict: "user_id" });
    if (data.shards != null) {
      await supabase.from("profiles").update({ shards: data.shards }).eq("id", userId);
    }
    return { ok: true };
  });

const RunSchema = z.object({
  mapId: z.string().min(1).max(64),
  waveReached: z.number().int().min(0).max(999),
  victory: z.boolean(),
  shardsEarned: z.number().int().min(0).max(10000),
});

export const recordRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("runs").insert({
      user_id: userId,
      map_id: data.mapId,
      wave_reached: data.waveReached,
      victory: data.victory,
      shards_earned: data.shardsEarned,
    });
    // add shards
    const { data: prof } = await supabase.from("profiles").select("shards").eq("id", userId).maybeSingle();
    const current = prof?.shards ?? 0;
    await supabase.from("profiles").update({ shards: current + data.shardsEarned }).eq("id", userId);
    return { ok: true, totalShards: current + data.shardsEarned };
  });
