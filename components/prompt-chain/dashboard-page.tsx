"use client";

import Link from "next/link";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import { relativeDate } from "@/components/prompt-chain/shared";

function DashboardContent() {
  const { flavors } = usePromptChainWorkspace();

  return (
    <>
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Where to go</h2>
            <p className="muted sectionNote">
              Open any flavor from the list below, then use the three page tabs for the specific
              task you want.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          <article className="linkCard">
            <span className="panelTag">1</span>
            <h3>Edit flavor</h3>
            <p className="muted">Update the flavor metadata and rearrange prompt steps in sequence.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">2</span>
            <h3>Test flavor</h3>
            <p className="muted">Pick an image visually, preview it, and run the live generation flow.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">3</span>
            <h3>Inspect history</h3>
            <p className="muted">Review saved captions and raw model responses without cluttering the editor.</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Create a new flavor</h2>
            <p className="muted sectionNote">
              Use the dedicated <strong>New flavor</strong> page from the sidebar. After you save
              it, the app opens the edit page automatically so you can start adding steps.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          <article className="linkCard">
            <span className="panelTag">Step 1</span>
            <h3>Name it clearly</h3>
            <p className="muted">Use a short slug that describes the tone or style of the prompt chain.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Step 2</span>
            <h3>Describe the goal</h3>
            <p className="muted">Write a concise summary of what the flavor is trying to produce.</p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Step 3</span>
            <h3>Add steps on the edit page</h3>
            <p className="muted">Once created, you will land on the editor where you can build the full chain.</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Recent flavors</h2>
            <p className="muted sectionNote">Jump directly into the flavor you want to work on.</p>
          </div>
          <span className="panelTag">{flavors.length} total</span>
        </div>
        <div className="dashboardGrid">
          {flavors.slice(0, 9).map((flavor) => (
            <Link key={flavor.id} href={`/flavors/${flavor.id}`} className="linkCard recentFlavorTile">
              <span className="flavorSlug">{flavor.slug}</span>
              <p className="muted">{flavor.description || "No description yet."}</p>
              <span className="linkMeta">Updated {relativeDate(flavor.modified_datetime_utc)}</span>
            </Link>
          ))}
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
