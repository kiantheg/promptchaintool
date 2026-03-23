"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { missingSupabaseMessage, supabase } from "@/lib/supabase-browser";
import { ThemeModeControl } from "@/components/prompt-chain/theme-mode-control";
import {
  type HumorFlavor,
  type Profile,
  getMyProfile,
  listHumorFlavors,
} from "@/lib/supabase-rest";

type WorkspaceContextValue = {
  token: string;
  me: Profile;
  flavors: HumorFlavor[];
  selectedFlavor: HumorFlavor | null;
  refreshFlavors: () => Promise<HumorFlavor[]>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function usePromptChainWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("usePromptChainWorkspace must be used within PromptChainShell.");
  }
  return context;
}

type PromptChainShellProps = {
  selectedFlavorId?: number | null;
  children: ReactNode;
};

export function PromptChainShell({ selectedFlavorId = null, children }: PromptChainShellProps) {
  const pathname = usePathname();

  const [status, setStatus] = useState("Checking session...");
  const [error, setError] = useState<string | null>(
    supabase ? null : missingSupabaseMessage,
  );
  const [loading, setLoading] = useState(Boolean(supabase));
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [flavorFilter, setFlavorFilter] = useState("");

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId],
  );

  const filteredFlavors = useMemo(() => {
    const query = flavorFilter.trim().toLowerCase();
    if (!query) return flavors;
    return flavors.filter((flavor) => {
      return (
        flavor.slug.toLowerCase().includes(query) ||
        (flavor.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [flavorFilter, flavors]);

  const refreshFlavors = async () => {
    if (!token) return [];
    const nextFlavors = await listHumorFlavors(token);
    setFlavors(nextFlavors);
    return nextFlavors;
  };

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        setStatus("Unable to load session");
        setLoading(false);
        return;
      }

      const session = data.session;
      if (!session) {
        setStatus("Redirecting to login...");
        window.location.replace("/login");
        return;
      }

      setToken(session.access_token);
      const profile = await getMyProfile(session.access_token, session.user.id);
      setMe(profile);

      if (!profile) {
        setError("No profile row found for this account.");
        setStatus("Missing profile");
        setLoading(false);
        return;
      }

      const canAccess = Boolean(profile.is_superadmin || profile.is_matrix_admin);
      setAuthorized(canAccess);
      if (!canAccess) {
        setStatus("This account is not an authorized admin.");
        setLoading(false);
        return;
      }

      setStatus("Loading prompt chain workspace...");
      try {
        setFlavors(await listHumorFlavors(session.access_token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load flavors.");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signOut = async () => {
    const client = supabase;
    if (client) {
      await client.auth.signOut();
    }
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <main className="shell">
        <section className="loadingPanel">
          <p className="eyebrow">Prompt Chain Tool</p>
          <h1>{status}</h1>
          <p className="muted">Pulling your session, admin flags, and prompt-chain workspace.</p>
        </section>
      </main>
    );
  }

  if (!authorized || !token || !me) {
    return (
      <main className="shell">
        <section className="loadingPanel">
          <p className="eyebrow">Access Control</p>
          <h1>Admin access required</h1>
          <p className="muted">
            This page only works when <code>profiles.is_superadmin = true</code> or{" "}
            <code>profiles.is_matrix_admin = true</code>.
          </p>
          {me && (
            <p className="muted">
              Signed in as {me.email ?? me.id}
              {me.is_superadmin ? " · superadmin" : ""}
              {me.is_matrix_admin ? " · matrix admin" : ""}
            </p>
          )}
          {error && <p className="errorBanner">{error}</p>}
          <button type="button" className="ghostButton" onClick={signOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ token, me, flavors, selectedFlavor, refreshFlavors }}>
      <main className="shell">
        <div className="appFrame">
          <aside className="sidebar">
            <Link href="/" className="sidebarTop sidebarHomeLink">
              <p className="eyebrow">Prompt Chain Tool</p>
              <h1>Humor flavor workspace</h1>
              <p className="muted sectionNote">
                Pick a flavor from the left. Once selected, use the tabs in the main area to move
                between Edit, Test, and History.
              </p>
            </Link>

            <section className="panel compactPanel railSection flavorRail">
              <div className="panelHeader panelHeaderTight">
                <div>
                  <h2>Browse flavors</h2>
                  <p className="muted sectionNote">Select a flavor to open its tabs in the main workspace.</p>
                </div>
                <span className="pill">{flavors.length}</span>
              </div>

              <div className="toolbarRow toolbarRowCompact">
                <input
                  className="searchInput"
                  placeholder="Filter flavors..."
                  value={flavorFilter}
                  onChange={(event) => setFlavorFilter(event.target.value)}
                />
              </div>

              <div className="flavorList flavorListCompact">
                {filteredFlavors.map((flavor) => {
                  const href = `/flavors/${flavor.id}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={flavor.id}
                      href={href}
                      className={isActive ? "flavorCard flavorCardActive" : "flavorCard"}
                    >
                      <div className="flavorCardTop">
                        <span className="flavorSlug">{flavor.slug}</span>
                        <span className="flavorMeta">#{flavor.id}</span>
                      </div>
                      <span className="flavorDescription">{flavor.description || "No description yet."}</span>
                    </Link>
                  );
                })}
                {filteredFlavors.length === 0 && (
                  <p className="muted emptyNotice">No flavors match this filter.</p>
                )}
              </div>
            </section>

          </aside>

          <section className="mainStage">
            <header className="hero panel">
              <div className="heroCopy">
                <p className="eyebrow">{selectedFlavor ? "Flavor workspace" : "Dashboard"}</p>
                <h2>{selectedFlavor ? selectedFlavor.slug : "Choose a flavor"}</h2>
                <p className="muted sectionNote">
                  Signed in as {me.email ?? me.id}. This app uses the same Supabase project as your
                  other admin tools.
                </p>
              </div>
              <div className="heroActions">
                <Link href="/flavors/new" className="primaryButton primaryLinkButton">
                  + New flavor
                </Link>
                <ThemeModeControl />
                <div className="identityCard">
                  <span>{me.is_superadmin ? "Superadmin" : "Matrix admin"}</span>
                  <strong>{me.first_name || me.email || me.id}</strong>
                </div>
                <button type="button" className="ghostButton" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </header>

            {selectedFlavor && (
              <nav className="flavorNav panel">
                <div className="navIntro">
                  <span className="eyebrow">Current Pages</span>
                  <p className="muted sectionNote">
                    You are working on <strong>{selectedFlavor.slug}</strong>. Choose a tab:
                  </p>
                </div>
                <div className="navLinkRow">
                  <Link
                    href={`/flavors/${selectedFlavor.id}`}
                    className={
                      pathname === `/flavors/${selectedFlavor.id}` ? "navLink navLinkActive" : "navLink"
                    }
                  >
                    Edit flavor
                  </Link>
                  <Link
                    href={`/flavors/${selectedFlavor.id}/test`}
                    className={
                      pathname === `/flavors/${selectedFlavor.id}/test`
                        ? "navLink navLinkActive"
                        : "navLink"
                    }
                  >
                    Test flavor
                  </Link>
                  <Link
                    href={`/flavors/${selectedFlavor.id}/history`}
                    className={
                      pathname === `/flavors/${selectedFlavor.id}/history`
                        ? "navLink navLinkActive"
                        : "navLink"
                    }
                  >
                    History
                  </Link>
                </div>
              </nav>
            )}

            {error && <p className="errorBanner">{error}</p>}
            {children}
          </section>
        </div>
      </main>
    </WorkspaceContext.Provider>
  );
}
