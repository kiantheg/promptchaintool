"use client";

import { useEffect, useState } from "react";
import { ThemeModeControl } from "@/components/prompt-chain/theme-mode-control";
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
      <div className="authLayout">
        <section className="authPanel authBrandPanel">
          <div className="authTopRow">
            <div />
            <ThemeModeControl compact />
          </div>
          <p className="eyebrow">Prompt Chain Tool</p>
          <h1>Humor flavor workspace</h1>
          <p className="muted sectionNote">
            Manage humor flavors, test prompt chains, and inspect caption history from one place.
          </p>
          <div className="authFeatureList">
            <article className="authFeatureCard">
              <span className="panelTag">Edit</span>
              <h3>Build prompt chains</h3>
              <p className="muted">Create flavors, reorder steps, and keep the chain structure clean.</p>
            </article>
            <article className="authFeatureCard">
              <span className="panelTag">Test</span>
              <h3>Preview with images</h3>
              <p className="muted">Choose public images visually and run generation before publishing changes.</p>
            </article>
            <article className="authFeatureCard">
              <span className="panelTag">History</span>
              <h3>Review model output</h3>
              <p className="muted">See saved captions and raw model responses without leaving the workspace.</p>
            </article>
          </div>
        </section>

        <section className="authPanel authActionPanel">
          <div className="authTopRow authTopRowMobileOnly">
            <ThemeModeControl compact />
          </div>
          <p className="eyebrow">Admin Access</p>
          <h2>Sign in with Google</h2>
          <p className="muted sectionNote">
            After login, the app will verify <code>profiles.is_superadmin</code> or{" "}
            <code>profiles.is_matrix_admin</code> before opening the workspace.
          </p>
          <button type="button" className="primaryButton authPrimaryButton" onClick={signInWithGoogle} disabled={loading}>
            {loading ? "Opening Google..." : "Continue with Google"}
          </button>
          {message && <p className="errorBanner">{message}</p>}
        </section>
      </div>
    </main>
  );
}
