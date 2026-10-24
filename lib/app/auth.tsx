"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Role = "reclaimer" | "operator" | "pro" | "business";
export type AgeBand = "18-24" | "25-34" | "35+";

export type Profile = {
  role: Role;
  displayName: string;
  qrToken: string | null;
  area: string | null;
  ageBand: string | null;
  sawprs: "unknown" | "pending" | "registered";
};

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
  area: string;
  ageBand: AgeBand | null;
  kind: "reclaimer" | "business";
};

type Auth = {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email or password is not right.";
  if (m.includes("not confirmed")) return "Confirm your email first, then sign in.";
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Sign in instead.";
  if (m.includes("password")) return "The password must be at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a few minutes and try again.";
  if (m.includes("fetch") || m.includes("network")) return "No connection. Try again when you have a signal.";
  return "Something went wrong. Try again.";
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const db = createClient();
  const { data: p } = await db.from("profiles").select("role, display_name").eq("id", userId).maybeSingle();
  if (!p) return null;
  let qrToken: string | null = null;
  let area: string | null = null;
  let ageBand: string | null = null;
  let sawprs: Profile["sawprs"] = "unknown";
  if (p.role === "reclaimer") {
    const { data: r } = await db.from("reclaimers").select("qr_token, area_id, age_band, sawprs_status").eq("profile_id", userId).maybeSingle();
    qrToken = r?.qr_token ?? null;
    area = r?.area_id ?? null;
    ageBand = r?.age_band ?? null;
    sawprs = (r?.sawprs_status as Profile["sawprs"] | undefined) ?? "unknown";
  }
  return { role: p.role as Role, displayName: p.display_name, qrToken, area, ageBand, sawprs };
}

/** First sign-in after sign-up: create the profile from what the person typed when they signed up. */
async function ensureProfile(user: User): Promise<Profile | null> {
  const existing = await loadProfile(user.id);
  if (existing) return existing;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const db = createClient();
  const name = meta.display_name?.trim() || user.email?.split("@")[0] || "Friend";
  const area = meta.area?.trim() || "Soweto";
  const { error } =
    meta.account_kind === "business"
      ? await db.rpc("register_business", { p_name: name, p_area: area })
      : await db.rpc("register_reclaimer", { p_name: name, p_area: area, p_age_band: meta.age_band || null });
  if (error) return null;
  return loadProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const userId = useRef<string | null>(null);
  const inflight = useRef<{ id: string; run: Promise<void> } | null>(null);

  // The session check and the sign-in event can both ask for the profile at the same moment. Share one request,
  // and never replace a good profile with nothing when a request fails.
  const load = useCallback((u: User | null): Promise<void> => {
    setUser(u);
    if (!u) {
      userId.current = null;
      setProfile(null);
      return Promise.resolve();
    }
    if (userId.current !== u.id) {
      userId.current = u.id;
      setProfile(null);
    }
    if (inflight.current?.id === u.id) return inflight.current.run;
    const run = (async () => {
      try {
        const next = await ensureProfile(u);
        setProfile((cur) => next ?? cur);
      } catch {
        // Offline: keep the signed-in state and show what we have.
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = { id: u.id, run };
    return run;
  }, []);

  useEffect(() => {
    const db = createClient();
    let alive = true;
    db.auth.getSession().then(async ({ data }) => {
      await load(data.session?.user ?? null);
      if (alive) setReady(true);
    });
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      // Never await Supabase calls inside this callback. Defer to the next tick.
      setTimeout(() => void load(session?.user ?? null), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendly(error.message) : null;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await createClient().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { display_name: input.name.trim(), area: input.area.trim(), age_band: input.ageBand, account_kind: input.kind },
      },
    });
    if (error) return { error: friendly(error.message), needsConfirm: false };
    return { error: null, needsConfirm: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await createClient().auth.getUser();
    await load(data.user);
  }, [load]);

  const value = useMemo<Auth>(
    () => ({ ready, user, profile, signIn, signUp, signOut, refresh }),
    [ready, user, profile, signIn, signUp, signOut, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}

export function firstName(profile: Profile | null): string {
  return profile?.displayName.split(" ")[0] ?? "";
}
