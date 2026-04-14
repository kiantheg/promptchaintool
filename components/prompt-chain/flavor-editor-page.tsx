"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  EMPTY_STEP_FORM,
  formatDate,
  getLookupLabel,
  toFlavorForm,
  toStepForm,
  type FlavorFormState,
  type StepFormState,
} from "@/components/prompt-chain/shared";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import { Modal, ConfirmModal } from "@/components/prompt-chain/modal";
import {
  type HumorFlavorStep,
  type LlmModel,
  type LookupRow,
  createHumorFlavor,
  createHumorFlavorStep,
  deleteHumorFlavor,
  deleteHumorFlavorStep,
  listHumorFlavorSteps,
  listLlmModels,
  listLookupRows,
  updateHumorFlavor,
  updateHumorFlavorStep,
} from "@/lib/supabase-rest";

/* ─── Step form fields ─── */
function StepFormFields({
  form,
  onChange,
  llmModels,
  inputTypes,
  outputTypes,
  stepTypes,
}: {
  form: StepFormState;
  onChange: (update: Partial<StepFormState>) => void;
  llmModels: LlmModel[];
  inputTypes: LookupRow[];
  outputTypes: LookupRow[];
  stepTypes: LookupRow[];
}) {
  return (
    <div className="stackForm">
      <div className="fieldGrid">
        <label className="field">
          <span>Description</span>
          <input
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Step title"
          />
        </label>
        <label className="field">
          <span>Temperature</span>
          <input
            value={form.llm_temperature}
            onChange={(e) => onChange({ llm_temperature: e.target.value })}
            placeholder="Optional (e.g. 0.7)"
          />
        </label>
      </div>
      <div className="fieldGrid">
        <label className="field">
          <span>Model</span>
          <select
            value={form.llm_model_id}
            onChange={(e) => onChange({ llm_model_id: e.target.value })}
            required
          >
            <option value="">Select a model</option>
            {llmModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Step type</span>
          <select
            value={form.humor_flavor_step_type_id}
            onChange={(e) => onChange({ humor_flavor_step_type_id: e.target.value })}
            required
          >
            <option value="">Select a step type</option>
            {stepTypes.map((r) => (
              <option key={r.id} value={r.id}>{getLookupLabel(r)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Input type</span>
          <select
            value={form.llm_input_type_id}
            onChange={(e) => onChange({ llm_input_type_id: e.target.value })}
            required
          >
            <option value="">Select input type</option>
            {inputTypes.map((r) => (
              <option key={r.id} value={r.id}>{getLookupLabel(r)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Output type</span>
          <select
            value={form.llm_output_type_id}
            onChange={(e) => onChange({ llm_output_type_id: e.target.value })}
            required
          >
            <option value="">Select output type</option>
            {outputTypes.map((r) => (
              <option key={r.id} value={r.id}>{getLookupLabel(r)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>System prompt</span>
        <textarea
          rows={7}
          value={form.llm_system_prompt}
          onChange={(e) => onChange({ llm_system_prompt: e.target.value })}
          placeholder="Instructions that set the model's role and behavior..."
        />
      </label>
      <label className="field">
        <span>User prompt</span>
        <textarea
          rows={9}
          value={form.llm_user_prompt}
          onChange={(e) => onChange({ llm_user_prompt: e.target.value })}
          placeholder="The actual request sent to the model..."
        />
      </label>
    </div>
  );
}

/* ─── Single step card ─── */
function StepCard({
  step,
  index,
  total,
  llmModels,
  inputTypes,
  outputTypes,
  stepTypes,
  saving,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  step: HumorFlavorStep;
  index: number;
  total: number;
  llmModels: LlmModel[];
  inputTypes: LookupRow[];
  outputTypes: LookupRow[];
  stepTypes: LookupRow[];
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const model = llmModels.find((r) => r.id === step.llm_model_id);
  const inputType = inputTypes.find((r) => r.id === step.llm_input_type_id);
  const outputType = outputTypes.find((r) => r.id === step.llm_output_type_id);
  const stepType = stepTypes.find((r) => r.id === step.humor_flavor_step_type_id);

  return (
    <article className="stepCardV2">
      {/* Header row */}
      <div className="stepCardHeader">
        <div className="stepBadge">{index + 1}</div>
        <div className="stepCardTitle">
          <div className="stepCardName">{step.description || "Untitled step"}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Step {index + 1} of {total}
          </div>
        </div>
        <div className="stepCardActions">
          <button
            type="button"
            className="iconButton"
            title="Move up"
            disabled={index === 0 || saving}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="iconButton"
            title="Move down"
            disabled={index === total - 1 || saving}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="iconButton"
            title="Edit step"
            onClick={onEdit}
          >
            ✎
          </button>
          <button
            type="button"
            className="iconButton iconButtonDanger"
            title="Delete step"
            disabled={saving}
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="stepCardBody">
        {/* Meta chips */}
        <div className="stepMetaChips">
          <span className="stepMetaChip">
            <span className="stepMetaChipLabel">Type</span>
            <span className="stepMetaChipValue">{getLookupLabel(stepType)}</span>
          </span>
          <span className="stepMetaChip">
            <span className="stepMetaChipLabel">Model</span>
            <span className="stepMetaChipValue">{model?.name || `#${step.llm_model_id}`}</span>
          </span>
          <span className="stepMetaChip">
            <span className="stepMetaChipLabel">In</span>
            <span className="stepMetaChipValue">{getLookupLabel(inputType)}</span>
          </span>
          <span className="stepMetaChip">
            <span className="stepMetaChipLabel">Out</span>
            <span className="stepMetaChipValue">{getLookupLabel(outputType)}</span>
          </span>
          {step.llm_temperature !== null && (
            <span className="stepMetaChip">
              <span className="stepMetaChipLabel">Temp</span>
              <span className="stepMetaChipValue">{step.llm_temperature}</span>
            </span>
          )}
        </div>

        {/* Prompt display */}
        <div className="promptGrid">
          <div className="promptBlock">
            <span className="promptDisplayLabel">System prompt</span>
            <pre className="promptDisplayText">
              {step.llm_system_prompt || <em style={{ color: "var(--muted)" }}>No system prompt.</em>}
            </pre>
          </div>
          <div className="promptBlock">
            <span className="promptDisplayLabel">User prompt</span>
            <pre className="promptDisplayText">
              {step.llm_user_prompt || <em style={{ color: "var(--muted)" }}>No user prompt.</em>}
            </pre>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Main editor content ─── */
function FlavorEditorContent() {
  const router = useRouter();
  const { token, me, selectedFlavor, refreshFlavors, showToast } = usePromptChainWorkspace();

  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [inputTypes, setInputTypes] = useState<LookupRow[]>([]);
  const [outputTypes, setOutputTypes] = useState<LookupRow[]>([]);
  const [stepTypes, setStepTypes] = useState<LookupRow[]>([]);

  const [flavorSaving, setFlavorSaving] = useState(false);
  const [stepSaving, setStepSaving] = useState(false);

  const [editFlavorForm, setEditFlavorForm] = useState<FlavorFormState>({ slug: "", description: "" });

  /* Modal state */
  const [editStepModal, setEditStepModal] = useState<{ open: boolean; stepId: number | null }>({
    open: false,
    stepId: null,
  });
  const [editStepForm, setEditStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);

  const [createStepModal, setCreateStepModal] = useState(false);
  const [createStepForm, setCreateStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);

  const [deleteStepModal, setDeleteStepModal] = useState<{ open: boolean; stepId: number | null }>({
    open: false,
    stepId: null,
  });

  const [deleteFlavorModal, setDeleteFlavorModal] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState(false);
  const [duplicateSlug, setDuplicateSlug] = useState("");
  const [duplicateSaving, setDuplicateSaving] = useState(false);

  useEffect(() => {
    if (!selectedFlavor) return;
    setEditFlavorForm(toFlavorForm(selectedFlavor));
  }, [selectedFlavor]);

  useEffect(() => {
    if (!selectedFlavor) return;
    const load = async () => {
      try {
        const [stepRows, modelRows, inputRows, outputRows, stepTypeRows] = await Promise.all([
          listHumorFlavorSteps(token, selectedFlavor.id),
          listLlmModels(token),
          listLookupRows(token, "llm_input_types"),
          listLookupRows(token, "llm_output_types"),
          listLookupRows(token, "humor_flavor_step_types"),
        ]);
        setSteps(stepRows);
        setLlmModels(modelRows);
        setInputTypes(inputRows);
        setOutputTypes(outputRows);
        setStepTypes(stepTypeRows);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Unable to load flavor details.", "error");
      }
    };
    void load();
  }, [selectedFlavor, token, showToast]);

  if (!selectedFlavor) {
    return (
      <section className="panel">
        <h2>Flavor not found</h2>
        <p className="muted">Pick a flavor from the sidebar or create a new one.</p>
      </section>
    );
  }

  const reloadSteps = async () => {
    setSteps(await listHumorFlavorSteps(token, selectedFlavor.id));
  };

  /* ── Flavor update ── */
  const handleUpdateFlavor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFlavorSaving(true);
    try {
      await updateHumorFlavor(token, me.id, selectedFlavor.id, {
        slug: editFlavorForm.slug.trim(),
        description: editFlavorForm.description.trim() || null,
      });
      await refreshFlavors();
      showToast("Flavor updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update flavor.", "error");
    } finally {
      setFlavorSaving(false);
    }
  };

  /* ── Flavor delete ── */
  const handleDeleteFlavor = async () => {
    setFlavorSaving(true);
    try {
      await deleteHumorFlavor(token, selectedFlavor.id);
      await refreshFlavors();
      setDeleteFlavorModal(false);
      showToast("Flavor deleted.");
      router.push("/");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to delete flavor.", "error");
    } finally {
      setFlavorSaving(false);
    }
  };

  /* ── Flavor duplicate ── */
  const handleDuplicate = async () => {
    const slug = duplicateSlug.trim();
    if (!slug) return;
    setDuplicateSaving(true);
    try {
      const created = await createHumorFlavor(token, me.id, {
        slug,
        description: selectedFlavor.description,
      });
      const newFlavor = created[0];
      if (newFlavor) {
        /* Copy all steps */
        for (const step of steps) {
          await createHumorFlavorStep(token, me.id, {
            humor_flavor_id: newFlavor.id,
            order_by: step.order_by,
            description: step.description,
            llm_system_prompt: step.llm_system_prompt,
            llm_user_prompt: step.llm_user_prompt,
            llm_temperature: step.llm_temperature,
            llm_model_id: step.llm_model_id,
            llm_input_type_id: step.llm_input_type_id,
            llm_output_type_id: step.llm_output_type_id,
            humor_flavor_step_type_id: step.humor_flavor_step_type_id,
          });
        }
        await refreshFlavors();
        setDuplicateModal(false);
        setDuplicateSlug("");
        showToast(`Flavor duplicated as "${slug}".`);
        router.push(`/flavors/${newFlavor.id}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to duplicate flavor.", "error");
    } finally {
      setDuplicateSaving(false);
    }
  };

  /* ── Create step ── */
  const handleCreateStep = async () => {
    setStepSaving(true);
    try {
      await createHumorFlavorStep(token, me.id, {
        humor_flavor_id: selectedFlavor.id,
        order_by: steps.length + 1,
        description: createStepForm.description.trim() || null,
        llm_system_prompt: createStepForm.llm_system_prompt.trim() || null,
        llm_user_prompt: createStepForm.llm_user_prompt.trim() || null,
        llm_temperature: createStepForm.llm_temperature.trim()
          ? Number(createStepForm.llm_temperature)
          : null,
        llm_model_id: Number(createStepForm.llm_model_id),
        llm_input_type_id: Number(createStepForm.llm_input_type_id),
        llm_output_type_id: Number(createStepForm.llm_output_type_id),
        humor_flavor_step_type_id: Number(createStepForm.humor_flavor_step_type_id),
      });
      setCreateStepForm(EMPTY_STEP_FORM);
      setCreateStepModal(false);
      await reloadSteps();
      showToast("Step added to the chain.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to create step.", "error");
    } finally {
      setStepSaving(false);
    }
  };

  /* ── Edit step ── */
  const handleSaveStep = async () => {
    if (!editStepModal.stepId) return;
    setStepSaving(true);
    try {
      await updateHumorFlavorStep(token, me.id, editStepModal.stepId, {
        description: editStepForm.description.trim() || null,
        llm_system_prompt: editStepForm.llm_system_prompt.trim() || null,
        llm_user_prompt: editStepForm.llm_user_prompt.trim() || null,
        llm_temperature: editStepForm.llm_temperature.trim()
          ? Number(editStepForm.llm_temperature)
          : null,
        llm_model_id: Number(editStepForm.llm_model_id),
        llm_input_type_id: Number(editStepForm.llm_input_type_id),
        llm_output_type_id: Number(editStepForm.llm_output_type_id),
        humor_flavor_step_type_id: Number(editStepForm.humor_flavor_step_type_id),
      });
      setEditStepModal({ open: false, stepId: null });
      await reloadSteps();
      showToast("Step saved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update step.", "error");
    } finally {
      setStepSaving(false);
    }
  };

  /* ── Delete step ── */
  const handleDeleteStep = async () => {
    if (!deleteStepModal.stepId) return;
    setStepSaving(true);
    try {
      await deleteHumorFlavorStep(token, deleteStepModal.stepId);
      const remaining = await listHumorFlavorSteps(token, selectedFlavor.id);
      for (const [i, s] of remaining.entries()) {
        if (s.order_by !== i + 1) {
          await updateHumorFlavorStep(token, me.id, s.id, { order_by: i + 1 });
        }
      }
      setDeleteStepModal({ open: false, stepId: null });
      await reloadSteps();
      showToast("Step deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to delete step.", "error");
    } finally {
      setStepSaving(false);
    }
  };

  /* ── Move step ── */
  const handleMoveStep = async (stepId: number, direction: -1 | 1) => {
    const currentIndex = steps.findIndex((s) => s.id === stepId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const a = steps[currentIndex];
    const b = steps[nextIndex];
    setStepSaving(true);
    try {
      await Promise.all([
        updateHumorFlavorStep(token, me.id, a.id, { order_by: b.order_by }),
        updateHumorFlavorStep(token, me.id, b.id, { order_by: a.order_by }),
      ]);
      await reloadSteps();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to reorder step.", "error");
    } finally {
      setStepSaving(false);
    }
  };

  return (
    <>
      {/* Stat strip */}
      <div className="statsStrip statsStripCompact">
        <article className="statCard">
          <span>Flavor ID</span>
          <strong>{selectedFlavor.id}</strong>
        </article>
        <article className="statCard">
          <span>Steps</span>
          <strong>{steps.length}</strong>
        </article>
        <article className="statCard">
          <span>Updated</span>
          <strong className="statText">{formatDate(selectedFlavor.modified_datetime_utc)}</strong>
        </article>
      </div>

      {/* Flavor details form + duplicate */}
      <div className="gridTwo gridTwoTop">
        <form className="panel" onSubmit={handleUpdateFlavor}>
          <div className="panelHeader">
            <div>
              <h2>Flavor details</h2>
              <p className="muted sectionNote">Edit the basic metadata for this humor flavor.</p>
            </div>
          </div>
          <div className="fieldGrid">
            <label className="field">
              <span>Slug</span>
              <input
                value={editFlavorForm.slug}
                onChange={(e) =>
                  setEditFlavorForm((c) => ({ ...c, slug: e.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Last updated</span>
              <input value={formatDate(selectedFlavor.modified_datetime_utc)} readOnly />
            </label>
          </div>
          <label className="field" style={{ marginTop: 8 }}>
            <span>Description</span>
            <textarea
              rows={5}
              value={editFlavorForm.description}
              onChange={(e) =>
                setEditFlavorForm((c) => ({ ...c, description: e.target.value }))
              }
            />
          </label>
          <div className="rowActions" style={{ marginTop: 16 }}>
            <button type="submit" className="primaryButton" disabled={flavorSaving}>
              {flavorSaving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              className="ghostButton"
              onClick={() => {
                setDuplicateSlug(`${selectedFlavor.slug}-copy`);
                setDuplicateModal(true);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="dangerButton"
              onClick={() => setDeleteFlavorModal(true)}
              disabled={flavorSaving}
            >
              Delete
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Workflow</h2>
              <p className="muted sectionNote">This page is only for editing the chain itself.</p>
            </div>
          </div>
          <div className="dashboardGrid">
            <article className="linkCard">
              <span className="panelTag">Edit</span>
              <h3>Build and reorder steps</h3>
              <p className="muted">Keep prompt engineering decisions separate from testing and log review.</p>
            </article>
            <article className="linkCard">
              <span className="panelTag">Test</span>
              <h3>Use the test page</h3>
              <p className="muted">Preview images and run a live generation without cluttering this editor.</p>
            </article>
            <article className="linkCard">
              <span className="panelTag">History</span>
              <h3>Use the history page</h3>
              <p className="muted">Inspect saved captions and raw model output in a dedicated log view.</p>
            </article>
          </div>
        </section>
      </div>

      {/* Steps chain */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Prompt chain steps</h2>
            <p className="muted sectionNote">
              Each step runs in sequence. Steps are numbered in execution order — use the arrows to reorder.
            </p>
          </div>
          <span className="panelTag">{steps.length} steps</span>
        </div>

        {steps.length === 0 && (
          <p className="emptyNotice">
            No steps yet. Add the first step to start building the prompt chain.
          </p>
        )}

        <div className="stepsChain">
          {steps.map((step, index) => (
            <div key={step.id} className="stepChainItem">
              <StepCard
                step={step}
                index={index}
                total={steps.length}
                llmModels={llmModels}
                inputTypes={inputTypes}
                outputTypes={outputTypes}
                stepTypes={stepTypes}
                saving={stepSaving}
                onEdit={() => {
                  setEditStepForm(toStepForm(step));
                  setEditStepModal({ open: true, stepId: step.id });
                }}
                onDelete={() => setDeleteStepModal({ open: true, stepId: step.id })}
                onMoveUp={() => void handleMoveStep(step.id, -1)}
                onMoveDown={() => void handleMoveStep(step.id, 1)}
              />
              {index < steps.length - 1 && (
                <div className="stepConnector">
                  <div className="stepConnectorLine" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="addStepButton"
          onClick={() => {
            setCreateStepForm(EMPTY_STEP_FORM);
            setCreateStepModal(true);
          }}
        >
          + Add step
        </button>
      </section>

      {/* ── Edit step modal ── */}
      <Modal
        open={editStepModal.open}
        onClose={() => setEditStepModal({ open: false, stepId: null })}
        title="Edit step"
        subtitle="Update the configuration and prompts for this step."
        size="lg"
      >
        <StepFormFields
          form={editStepForm}
          onChange={(update) => setEditStepForm((c) => ({ ...c, ...update }))}
          llmModels={llmModels}
          inputTypes={inputTypes}
          outputTypes={outputTypes}
          stepTypes={stepTypes}
        />
        <div className="modalActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => setEditStepModal({ open: false, stepId: null })}
            disabled={stepSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => void handleSaveStep()}
            disabled={stepSaving}
          >
            {stepSaving ? "Saving..." : "Save step"}
          </button>
        </div>
      </Modal>

      {/* ── Create step modal ── */}
      <Modal
        open={createStepModal}
        onClose={() => setCreateStepModal(false)}
        title="Add step"
        subtitle="New steps are appended to the end of the flavor chain."
        size="lg"
      >
        <StepFormFields
          form={createStepForm}
          onChange={(update) => setCreateStepForm((c) => ({ ...c, ...update }))}
          llmModels={llmModels}
          inputTypes={inputTypes}
          outputTypes={outputTypes}
          stepTypes={stepTypes}
        />
        <div className="modalActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => setCreateStepModal(false)}
            disabled={stepSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => void handleCreateStep()}
            disabled={stepSaving}
          >
            {stepSaving ? "Creating..." : "Create step"}
          </button>
        </div>
      </Modal>

      {/* ── Delete step confirm modal ── */}
      <ConfirmModal
        open={deleteStepModal.open}
        onClose={() => setDeleteStepModal({ open: false, stepId: null })}
        onConfirm={() => void handleDeleteStep()}
        title="Delete step?"
        message="This will remove the step and reorder the remaining chain. This action cannot be undone."
        confirmLabel="Delete step"
        loading={stepSaving}
      />

      {/* ── Delete flavor confirm modal ── */}
      <ConfirmModal
        open={deleteFlavorModal}
        onClose={() => setDeleteFlavorModal(false)}
        onConfirm={() => void handleDeleteFlavor()}
        title={`Delete "${selectedFlavor.slug}"?`}
        message="This will permanently delete the flavor. It will fail if dependent rows (captions, etc.) still exist."
        confirmLabel="Delete flavor"
        loading={flavorSaving}
      />

      {/* ── Duplicate flavor modal ── */}
      <Modal
        open={duplicateModal}
        onClose={() => setDuplicateModal(false)}
        title="Duplicate flavor"
        subtitle={`Duplicating "${selectedFlavor.slug}" — all ${steps.length} step(s) will be copied.`}
        size="sm"
      >
        <div className="stackForm">
          <label className="field">
            <span>New flavor slug</span>
            <input
              value={duplicateSlug}
              onChange={(e) => setDuplicateSlug(e.target.value)}
              placeholder={`${selectedFlavor.slug}-copy`}
              autoFocus
            />
          </label>
        </div>
        <div className="modalActions">
          <button
            type="button"
            className="ghostButton"
            onClick={() => setDuplicateModal(false)}
            disabled={duplicateSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => void handleDuplicate()}
            disabled={duplicateSaving || !duplicateSlug.trim()}
          >
            {duplicateSaving ? "Duplicating..." : "Duplicate flavor"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function FlavorEditorPage({ flavorId }: { flavorId: number }) {
  return (
    <PromptChainShell selectedFlavorId={flavorId}>
      <FlavorEditorContent />
    </PromptChainShell>
  );
}
