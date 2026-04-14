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
    <main className="authPage">
      <div className="authThemeToggle">
        <ThemeModeControl compact />
      </div>

      <div className="authCard">
        {/* Brand section */}
        <div className="authCardBrand">
          <p className="authEyebrow">Prompt Chain Tool</p>
          <h1 className="authTitle">Humor Flavor Workspace</h1>
          <p className="authSubtitle">
            Manage humor flavors, test prompt chains, and inspect caption history — all from one place.
          </p>

          <div className="authFeatureList">
            <div className="authFeatureRow">
              <span className="authFeatureTag">Edit</span>
              <span className="authFeatureText">
                Build prompt chains — create flavors, reorder steps, keep the chain clean.
              </span>
            </div>
            <div className="authFeatureRow">
              <span className="authFeatureTag">Test</span>
              <span className="authFeatureText">
                Pick a real image and run live generation before publishing changes.
              </span>
            </div>
            <div className="authFeatureRow">
              <span className="authFeatureTag">History</span>
              <span className="authFeatureText">
                Review saved captions and raw model responses without leaving the workspace.
              </span>
            </div>
          </div>
        </div>

        {/* Sign-in section */}
        <div className="authCardAction">
          <p className="authActionLabel">Admin access required</p>

          <button
            type="button"
            className="authGoogleButton"
            onClick={() => void signInWithGoogle()}
            disabled={loading}
          >
            {loading ? "Opening Google…" : "Continue with Google"}
          </button>

          <p className="authNote">
            After signing in, the app verifies{" "}
            <code>profiles.is_superadmin</code> or{" "}
            <code>profiles.is_matrix_admin</code> before granting access.
          </p>

          {message && (
            <p className="errorBanner" style={{ marginTop: "1rem", marginBottom: 0 }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
