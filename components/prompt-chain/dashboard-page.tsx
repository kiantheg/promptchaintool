"use client";

import Link from "next/link";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import { relativeDate } from "@/components/prompt-chain/shared";

function DashboardContent() {
  const { flavors } = usePromptChainWorkspace();

  const recentFlavors = flavors.slice(0, 6);

  return (
    <>
      {/* Stat strip */}
      <div className="statsStrip statsStripCompact">
        <article className="statCard">
          <span>Total flavors</span>
          <strong>{flavors.length}</strong>
        </article>
        <article className="statCard">
          <span>Recently updated</span>
          <strong>{flavors.filter((f) => {
            if (!f.modified_datetime_utc) return false;
            const diffMs = Date.now() - new Date(f.modified_datetime_utc).getTime();
            return diffMs < 7 * 24 * 60 * 60 * 1000;
          }).length}</strong>
        </article>
        <article className="statCard">
          <span>Status</span>
          <strong style={{ fontSize: "1rem", lineHeight: 1.3, color: "var(--success)" }}>Active</strong>
        </article>
      </div>

      {/* Quick actions */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Quick actions</h2>
            <p className="muted sectionNote">Jump straight into common tasks.</p>
          </div>
        </div>
        <div className="quickActions">
          <Link href="/flavors/new" className="primaryButton primaryLinkButton">
            + New flavor
          </Link>
        </div>
      </section>

      {/* Workflow guide */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Workflow guide</h2>
            <p className="muted sectionNote">
              Pick a flavor from the sidebar, then use the tabs to move between Edit, Test, and History.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          <article className="linkCard">
            <span className="panelTag">Edit</span>
            <h3>Build the prompt chain</h3>
            <p className="muted">Update flavor metadata and arrange LLM steps in execution order.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Test</span>
            <h3>Run a live generation</h3>
            <p className="muted">Pick an image visually and run the full generation pipeline against it.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">History</span>
            <h3>Review past outputs</h3>
            <p className="muted">Inspect saved captions and raw model responses without cluttering the editor.</p>
          </article>
        </div>
      </section>

      {/* Recent flavors */}
      {recentFlavors.length > 0 && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Recent flavors</h2>
              <p className="muted sectionNote">Jump directly into the flavor you want to work on.</p>
            </div>
            <span className="panelTag">{flavors.length} total</span>
          </div>
          <div className="dashboardGrid">
            {recentFlavors.map((flavor) => (
              <Link
                key={flavor.id}
                href={`/flavors/${flavor.id}`}
                className="linkCard recentFlavorTile"
              >
                <span className="panelTag" style={{ fontSize: 10 }}>#{flavor.id}</span>
                <span className="flavorSlug" style={{ fontSize: 15 }}>{flavor.slug}</span>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  {flavor.description || "No description yet."}
                </p>
                <span className="linkMeta">Updated {relativeDate(flavor.modified_datetime_utc)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Creation guide */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Creating a new flavor</h2>
            <p className="muted sectionNote">
              Use the <strong>+ New flavor</strong> button above or in the header. After saving, the editor
              opens automatically so you can start adding steps.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          <article className="linkCard">
            <span className="panelTag">Step 1</span>
            <h3>Name it clearly</h3>
            <p className="muted">Use a short slug that describes the tone or style, e.g. <code>gen-z-roast</code>.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Step 2</span>
            <h3>Describe the goal</h3>
            <p className="muted">Write a concise summary of what kind of captions the chain should produce.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Step 3</span>
            <h3>Add steps on the edit page</h3>
            <p className="muted">Once created, add LLM steps in execution order on the flavor editor.</p>
          </article>
        </div>
      </section>
    </>
  );
}

export function DashboardPage() {
  return (
    <PromptChainShell>
      <DashboardContent />
    </PromptChainShell>
  );
}
