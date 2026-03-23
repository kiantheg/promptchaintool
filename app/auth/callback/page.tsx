"use client";

import { useEffect, useState } from "react";
import { missingSupabaseMessage, supabase } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const [message] = useState(
    supabase ? "Finishing sign-in..." : missingSupabaseMessage,
  );

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");
      const errorCode = url.searchParams.get("error");

      if (errorDescription || errorCode) {
        const nextMessage = errorDescription || errorCode || "oauth_error";
        window.location.replace(`/login?error=${encodeURIComponent(nextMessage)}`);
        return;
      }

      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          window.location.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken) {
        const { error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? "",
        });

        if (error) {
          window.location.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      for (let i = 0; i < 5; i += 1) {
        const { data } = await client.auth.getSession();
        if (data.session) {
          window.location.replace("/");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      window.location.replace("/login?error=missing_session");
    })();
  }, []);

  return (
    <main className="shell authShell">
      <section className="authPanel">
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}
