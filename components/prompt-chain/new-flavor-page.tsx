"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EMPTY_FLAVOR_FORM, type FlavorFormState } from "@/components/prompt-chain/shared";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import { createHumorFlavor } from "@/lib/supabase-rest";

function NewFlavorContent() {
  const router = useRouter();
  const { token, me, refreshFlavors, showToast } = usePromptChainWorkspace();

  const [form, setForm] = useState<FlavorFormState>(EMPTY_FLAVOR_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const created = await createHumorFlavor(token, me.id, {
        slug: form.slug.trim(),
        description: form.description.trim() || null,
      });
      const nextFlavor = created[0];
      await refreshFlavors();
      showToast(`Flavor "${form.slug.trim()}" created successfully.`);
      if (nextFlavor?.id) {
        router.push(`/flavors/${nextFlavor.id}`);
      }
    } catch (saveError) {
      showToast(
        saveError instanceof Error ? saveError.message : "Unable to create flavor.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gridTwo gridTwoTop">
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Create a new flavor</h2>
            <p className="muted sectionNote">
              Give the flavor a unique slug and a clear description. After saving, the editor opens
              so you can start building the prompt chain.
            </p>
          </div>
          <span className="panelTag">New</span>
        </div>
        <form className="stackForm" onSubmit={handleSubmit}>
          <label className="field">
            <span>Slug</span>
            <input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value }))
              }
              placeholder="gen-z-dark-roast"
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={8}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Three-step chain that describes the image, reframes it, then outputs short roast captions."
            />
          </label>
          <button type="submit" className="primaryButton" disabled={saving}>
            {saving ? "Creating..." : "Create flavor and open editor"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Writing tips</h2>
            <p className="muted sectionNote">
              A clear flavor record makes the rest of the prompt chain easier to manage.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          <article className="linkCard">
            <span className="panelTag">Slug</span>
            <h3>Keep it short and stable</h3>
            <p className="muted">
              Use lowercase words separated by hyphens so the flavor is easy to scan in lists.
            </p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Description</span>
            <h3>Describe the output</h3>
            <p className="muted">
              Summarize what kind of captions the chain generates and roughly how many steps it needs.
            </p>
          </article>
          <article className="linkCard">
            <span className="panelTag">Next</span>
            <h3>Build the chain</h3>
            <p className="muted">
              After saving, go to the edit page and add LLM steps in execution order.
            </p>
          </article>
        </div>
        <div className="creationHint" style={{ marginTop: 16 }}>
          <strong>Example</strong>
          <p className="muted">
            <code>sports-commentator</code>
          </p>
          <p className="muted">
            <code>Identify the scene, exaggerate the stakes, then caption it like an unhinged live commentator.</code>
          </p>
        </div>
      </section>
    </div>
  );
}

export function NewFlavorPage() {
  return (
    <PromptChainShell>
      <NewFlavorContent />
    </PromptChainShell>
  );
}
