"use client";

import { useEffect, useState } from "react";
import { missingSupabaseMessage, supabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const oauthError = new URLSearchParams(window.location.search).get("error");
    return oauthError ? `Login error: ${oauthError}` : null;
  });

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        window.location.replace("/");
      }
    })();
  }, []);

  const signInWithGoogle = async () => {
    const client = supabase;
    if (!client) {
      setMessage(missingSupabaseMessage);
      return;
    }

    setLoading(true);
    setMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  };

  return (
    <main className="shell authShell">
      <section className="authPanel">
        <p className="eyebrow">Prompt Chain Tool</p>
        <h1>Admin login</h1>
        <p className="muted">
          Sign in with Google, then the app will check your `profiles.is_superadmin` and
          `profiles.is_matrix_admin` flags.
        </p>
        <button type="button" className="primaryButton" onClick={signInWithGoogle} disabled={loading}>
          {loading ? "Opening Google..." : "Continue with Google"}
        </button>
        {message && <p className="errorBanner">{message}</p>}
      </section>
    </main>
  );
}
