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

/* ===== TOAST CONTEXT ===== */
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
    }, 3400);
  }, []);

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId],
  );

  const filteredFlavors = useMemo(() => {
    const query = flavorFilter.trim().toLowerCase();
    if (!query) return flavors;
    return flavors.filter(
      (flavor) =>
        flavor.slug.toLowerCase().includes(query) ||
        (flavor.description ?? "").toLowerCase().includes(query),
    );
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
    if (client) await client.auth.signOut();
    window.location.replace("/login");
  };

  /* Toast container — always visible */
  const toastContainer = (
    <div className="toastContainer">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type === "success" ? "toastSuccess" : "toastError"}${toast.exiting ? " toastExiting" : ""}`}
        >
          {toast.type === "success" ? "✓  " : "✕  "}
          {toast.message}
        </div>
      ))}
    </div>
  );

  /* Loading / error states */
  if (loading) {
    return (
      <>
        {toastContainer}
        <main className="adminGate">
          <section className="gateCard">
            <p className="eyebrow">Prompt Chain Tool</p>
            <h1>{status}</h1>
            <p className="supporting">
              Checking your session, admin flags, and prompt-chain workspace.
            </p>
          </section>
        </main>
      </>
    );
  }

  if (!authorized || !token || !me) {
    return (
      <>
        {toastContainer}
        <main className="adminGate">
          <section className="gateCard">
            <p className="eyebrow">Access Control</p>
            <h1>Admin access required</h1>
            <p className="supporting">
              This page requires <code>profiles.is_superadmin = true</code> or{" "}
              <code>profiles.is_matrix_admin = true</code>.
            </p>
            {me && (
              <p className="supporting">
                Signed in as {me.email ?? me.id}
                {me.is_superadmin ? " · superadmin" : ""}
                {me.is_matrix_admin ? " · matrix admin" : ""}
              </p>
            )}
            {error && <p className="errorBanner" style={{ marginTop: "1rem" }}>{error}</p>}
            <button
              type="button"
              className="primaryButton"
              onClick={() => void signOut()}
              style={{ marginTop: "1rem" }}
            >
              Sign out
            </button>
          </section>
        </main>
      </>
    );
  }

  /* User display */
  const userInitial = (me.first_name?.charAt(0) || me.email?.charAt(0) || "A").toUpperCase();
  const userDisplayName = me.first_name || me.email || me.id;
  const userRole = me.is_superadmin ? "Superadmin" : "Matrix Admin";

  return (
    <ToastContext.Provider value={{ showToast }}>
      <WorkspaceContext.Provider
        value={{ token, me, flavors, selectedFlavor, refreshFlavors, showToast }}
      >
        {toastContainer}

        {/* ── Full-bleed layout (matches adminApp) ── */}
        <div className="adminApp">

          {/* ── Dark sidebar ── */}
          <aside className="sidebar">

            {/* Brand */}
            <div className="sidebarBrand">
              <Link href="/" style={{ textDecoration: "none" }}>
                <span className="sidebarBrandEyebrow">Prompt Chain Tool</span>
                <p className="sidebarBrandName">Humor Flavor Workspace</p>
                <p className="sidebarBrandDesc">
                  Pick a flavor to edit its chain, run generations, and inspect history.
                </p>
              </Link>
            </div>

            {/* Scrollable middle */}
            <div className="sidebarScroll">
              {/* Flavor rail */}
              <div className="flavorRail">
                <div className="flavorRailHeader">
                  <span className="flavorRailLabel">Flavors</span>
                  <span className="flavorRailCount">{flavors.length}</span>
                </div>

                <input
                  className="searchInput"
                  placeholder="Filter flavors…"
                  value={flavorFilter}
                  onChange={(e) => setFlavorFilter(e.target.value)}
                />

                <div className="flavorListCompact">
                  {filteredFlavors.map((flavor) => {
                    const href = `/flavors/${flavor.id}`;
                    const isActive =
                      pathname === href || pathname.startsWith(`${href}/`);
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
                        <span className="flavorDescription">
                          {flavor.description || "No description yet."}
                        </span>
                      </Link>
                    );
                  })}
                  {filteredFlavors.length === 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--sidebar-muted)", padding: "0.65rem 0.9rem" }}>
                      No flavors match this filter.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: identity + theme + sign out */}
            <div className="sidebarFooter">
              <div className="sidebarFooterRow">
                <div className="sidebarUserAvatar">{userInitial}</div>
                <div className="sidebarUserDetails">
                  <span className="sidebarUserName">{userDisplayName}</span>
                  <span className="sidebarUserRole">{userRole}</span>
                </div>
              </div>
              <ThemeModeControl compact />
              <button
                type="button"
                className="sidebarSignOutButton"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </aside>

          {/* ── Content shell ── */}
          <div className="contentShell">
            <div className="pageContent">

              {/* Page header */}
              <header className="pageHeader">
                <div className="pageHeaderTitle">
                  <p className="eyebrow" style={{ color: "var(--muted)", marginBottom: "0.2rem" }}>
                    {selectedFlavor ? "Flavor workspace" : "Dashboard"}
                  </p>
                  <h1 style={{ marginBottom: 0 }}>
                    {selectedFlavor ? selectedFlavor.slug : "Humor Flavors"}
                  </h1>
                </div>
                <div className="pageHeaderActions">
                  <Link href="/flavors/new" className="primaryButton">
                    + New flavor
                  </Link>
                </div>
              </header>

              {/* Flavor tab nav */}
              {selectedFlavor && (
                <nav className="flavorNav2">
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

              {error && (
                <p className="errorBanner">{error}</p>
              )}

              {children}
            </div>
          </div>

        </div>
      </WorkspaceContext.Provider>
    </ToastContext.Provider>
  );
}
