"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
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

/* ===== TOAST ===== */
type ToastType = "success" | "error";
type ToastItem = { id: string; message: string; type: ToastType; exiting: boolean };

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within PromptChainShell");
  return ctx;
}

/* ===== WORKSPACE CONTEXT ===== */
type WorkspaceContextValue = {
  token: string;
  me: Profile;
  flavors: HumorFlavor[];
  selectedFlavor: HumorFlavor | null;
  refreshFlavors: () => Promise<HumorFlavor[]>;
  showToast: (message: string, type?: ToastType) => void;
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

  /* Toast state */
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts((current) =>
        current.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 220);
    }, 3200);
  }, []);

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

  /* Toast container is always rendered */
  const toastContainer = (
    <div className="toastContainer">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type === "success" ? "toastSuccess" : "toastError"}${toast.exiting ? " toastExiting" : ""}`}
        >
          {toast.type === "success" ? "✓ " : "✕ "}
          {toast.message}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <>
        {toastContainer}
        <main className="shell">
          <section className="loadingPanel panel">
            <p className="eyebrow">Prompt Chain Tool</p>
            <h1>{status}</h1>
            <p className="muted">Pulling your session, admin flags, and prompt-chain workspace.</p>
          </section>
        </main>
      </>
    );
  }

  if (!authorized || !token || !me) {
    return (
      <>
        {toastContainer}
        <main className="shell">
          <section className="loadingPanel panel">
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
      </>
    );
  }

  /* User initials for avatar */
  const userInitial = (me.first_name?.charAt(0) || me.email?.charAt(0) || "A").toUpperCase();
  const userDisplayName = me.first_name || me.email || me.id;
  const userRole = me.is_superadmin ? "Superadmin" : "Matrix Admin";

  return (
    <ToastContext.Provider value={{ showToast }}>
      <WorkspaceContext.Provider value={{ token, me, flavors, selectedFlavor, refreshFlavors, showToast }}>
        {toastContainer}
        <main className="shell">
          <div className="appFrame">
            {/* ─── Sidebar ─── */}
            <aside className="sidebar">
              {/* Brand */}
              <Link href="/" className="sidebarBrand">
                <span className="sidebarBrandEyebrow">Prompt Chain Tool</span>
                <p className="sidebarBrandName">Humor Flavor Workspace</p>
                <p className="sidebarBrandDesc">
                  Pick a flavor to edit its chain, run test generations, and view history.
                </p>
              </Link>

              {/* Flavor rail */}
              <section className="panel compactPanel railSection flavorRail">
                <div className="panelHeader panelHeaderTight">
                  <div>
                    <h2>Flavors</h2>
                    <p className="muted sectionNote" style={{ fontSize: 12 }}>
                      Select a flavor to open its workspace.
                    </p>
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
                          <span className="flavorMeta" style={{ fontSize: 11 }}>#{flavor.id}</span>
                        </div>
                        <span className="flavorDescription">
                          {flavor.description || "No description yet."}
                        </span>
                      </Link>
                    );
                  })}
                  {filteredFlavors.length === 0 && (
                    <p className="muted emptyNotice" style={{ fontSize: 13 }}>
                      No flavors match this filter.
                    </p>
                  )}
                </div>
              </section>

              {/* User identity */}
              <div className="sidebarUser">
                <div className="sidebarUserInfo">
                  <div className="sidebarUserAvatar">{userInitial}</div>
                  <div className="sidebarUserDetails">
                    <span className="sidebarUserName">{userDisplayName}</span>
                    <span className="sidebarUserRole">{userRole}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ThemeModeControl compact />
                  <button
                    type="button"
                    className="ghostButton"
                    onClick={signOut}
                    style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </aside>

            {/* ─── Main stage ─── */}
            <section className="mainStage">
              {/* Header / Hero */}
              <header className="panel" style={{ padding: "18px 24px" }}>
                <div className="heroV2">
                  <div className="heroV2Title">
                    <p className="eyebrow" style={{ marginBottom: 4 }}>
                      {selectedFlavor ? "Flavor workspace" : "Dashboard"}
                    </p>
                    <h2 style={{ marginBottom: 0 }}>
                      {selectedFlavor ? selectedFlavor.slug : "Humor Flavors"}
                    </h2>
                  </div>
                  <div className="heroV2Actions">
                    <Link href="/flavors/new" className="primaryButton primaryLinkButton">
                      + New flavor
                    </Link>
                  </div>
                </div>
              </header>

              {/* Flavor tab nav */}
              {selectedFlavor && (
                <nav className="panel flavorNav2">
                  <span className="navFlavorLabel">{selectedFlavor.slug}</span>
                  <span className="navDivider">›</span>
                  <Link
                    href={`/flavors/${selectedFlavor.id}`}
                    className={
                      pathname === `/flavors/${selectedFlavor.id}`
                        ? "navLink navLinkActive"
                        : "navLink"
                    }
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/flavors/${selectedFlavor.id}/test`}
                    className={
                      pathname === `/flavors/${selectedFlavor.id}/test`
                        ? "navLink navLinkActive"
                        : "navLink"
                    }
                  >
                    Test
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
                </nav>
              )}

              {error && <p className="errorBanner">{error}</p>}
              {children}
            </section>
          </div>
        </main>
      </WorkspaceContext.Provider>
    </ToastContext.Provider>
  );
}
