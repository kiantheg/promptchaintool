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
import {
  type HumorFlavorStep,
  type LlmModel,
  type LookupRow,
  createHumorFlavorStep,
  deleteHumorFlavor,
  deleteHumorFlavorStep,
  listHumorFlavorSteps,
  listLlmModels,
  listLookupRows,
  updateHumorFlavor,
  updateHumorFlavorStep,
} from "@/lib/supabase-rest";

function FlavorEditorContent() {
  const router = useRouter();
  const { token, me, selectedFlavor, refreshFlavors } = usePromptChainWorkspace();

  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [inputTypes, setInputTypes] = useState<LookupRow[]>([]);
  const [outputTypes, setOutputTypes] = useState<LookupRow[]>([]);
  const [stepTypes, setStepTypes] = useState<LookupRow[]>([]);
  const [flavorSaving, setFlavorSaving] = useState(false);
  const [stepSaving, setStepSaving] = useState(false);
  const [stepEditingId, setStepEditingId] = useState<number | null>(null);
  const [editFlavorForm, setEditFlavorForm] = useState<FlavorFormState>({
    slug: "",
    description: "",
  });
  const [createStepForm, setCreateStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);
  const [editStepForm, setEditStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);

  useEffect(() => {
    if (!selectedFlavor) return;
    setEditFlavorForm(toFlavorForm(selectedFlavor));
  }, [selectedFlavor]);

  useEffect(() => {
    if (!selectedFlavor) return;

    const load = async () => {
      setError(null);
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load flavor details.");
      }
    };

    void load();
  }, [selectedFlavor, token]);

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

  const handleUpdateFlavor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFlavorSaving(true);
    setError(null);
    try {
      await updateHumorFlavor(token, me.id, selectedFlavor.id, {
        slug: editFlavorForm.slug.trim(),
        description: editFlavorForm.description.trim() || null,
      });
      await refreshFlavors();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update flavor.");
    } finally {
      setFlavorSaving(false);
    }
  };

  const handleDeleteFlavor = async () => {
    const confirmed = window.confirm(
      `Delete flavor "${selectedFlavor.slug}"? This will fail if dependent rows still exist.`,
    );
    if (!confirmed) return;

    setFlavorSaving(true);
    setError(null);
    try {
      await deleteHumorFlavor(token, selectedFlavor.id);
      await refreshFlavors();
      router.push("/");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete flavor.");
    } finally {
      setFlavorSaving(false);
    }
  };

  const handleCreateStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStepSaving(true);
    setError(null);
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
      await reloadSteps();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create step.");
    } finally {
      setStepSaving(false);
    }
  };

  const handleSaveStep = async (stepId: number) => {
    setStepSaving(true);
    setError(null);
    try {
      await updateHumorFlavorStep(token, me.id, stepId, {
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
      setStepEditingId(null);
      await reloadSteps();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update step.");
    } finally {
      setStepSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    const confirmed = window.confirm("Delete this step?");
    if (!confirmed) return;

    setStepSaving(true);
    setError(null);
    try {
      await deleteHumorFlavorStep(token, stepId);
      const remaining = await listHumorFlavorSteps(token, selectedFlavor.id);
      for (const [index, step] of remaining.entries()) {
        const desiredOrder = index + 1;
        if (step.order_by !== desiredOrder) {
          await updateHumorFlavorStep(token, me.id, step.id, { order_by: desiredOrder });
        }
      }
      setStepEditingId(null);
      await reloadSteps();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete step.");
    } finally {
      setStepSaving(false);
    }
  };

  const handleMoveStep = async (stepId: number, direction: -1 | 1) => {
    const currentIndex = steps.findIndex((step) => step.id === stepId);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    const currentStep = steps[currentIndex];
    const nextStep = steps[nextIndex];

    setStepSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateHumorFlavorStep(token, me.id, currentStep.id, { order_by: nextStep.order_by }),
        updateHumorFlavorStep(token, me.id, nextStep.id, { order_by: currentStep.order_by }),
      ]);
      await reloadSteps();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Unable to reorder step.");
    } finally {
      setStepSaving(false);
    }
  };

  return (
    <>
      {error && <p className="errorBanner">{error}</p>}
      <div className="statsStrip">
        <article className="statCard">
          <span>Flavor ID</span>
          <strong>{selectedFlavor.id}</strong>
        </article>
        <article className="statCard">
          <span>Step count</span>
          <strong>{steps.length}</strong>
        </article>
        <article className="statCard">
          <span>Updated</span>
          <strong className="statText">{formatDate(selectedFlavor.modified_datetime_utc)}</strong>
        </article>
      </div>

      <div className="gridTwo gridTwoTop">
        <form className="panel" onSubmit={handleUpdateFlavor}>
          <div className="panelHeader">
            <div>
              <h2>Flavor details</h2>
              <p className="muted sectionNote">Edit the basic metadata for this humor flavor.</p>
            </div>
            <button
              type="button"
              className="dangerButton"
              onClick={handleDeleteFlavor}
              disabled={flavorSaving}
            >
              Delete flavor
            </button>
          </div>
          <div className="fieldGrid">
            <label className="field">
              <span>Slug</span>
              <input
                value={editFlavorForm.slug}
                onChange={(event) =>
                  setEditFlavorForm((current) => ({ ...current, slug: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Last updated</span>
              <input value={formatDate(selectedFlavor.modified_datetime_utc)} readOnly />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={5}
              value={editFlavorForm.description}
              onChange={(event) =>
                setEditFlavorForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="primaryButton" disabled={flavorSaving}>
            {flavorSaving ? "Saving..." : "Update flavor"}
          </button>
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
              <p className="muted">Preview images visually and run a generation without cluttering this editor.</p>
            </article>
            <article className="linkCard">
              <span className="panelTag">History</span>
              <h3>Use the history page</h3>
              <p className="muted">Inspect saved captions and raw model output in a dedicated log view.</p>
            </article>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Flavor steps</h2>
            <p className="muted sectionNote">Each step runs in order. Move steps up or down to change the chain.</p>
          </div>
          <span className="panelTag">{steps.length} steps</span>
        </div>
        <div className="stepsList">
          {steps.map((step, index) => {
            const model = llmModels.find((row) => row.id === step.llm_model_id);
            const inputType = inputTypes.find((row) => row.id === step.llm_input_type_id);
            const outputType = outputTypes.find((row) => row.id === step.llm_output_type_id);
            const stepType = stepTypes.find((row) => row.id === step.humor_flavor_step_type_id);
            const isEditing = stepEditingId === step.id;

            return (
              <article key={step.id} className="stepCard">
                <div className="stepHeader">
                  <div className="stepTitleBlock">
                    <p className="eyebrow">Step {index + 1}</p>
                    <h3>{step.description || "Untitled step"}</h3>
                  </div>
                  <div className="rowActions rowActionsWrap">
                    <button
                      type="button"
                      className="ghostButton"
                      disabled={index === 0 || stepSaving}
                      onClick={() => void handleMoveStep(step.id, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      disabled={index === steps.length - 1 || stepSaving}
                      onClick={() => void handleMoveStep(step.id, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => {
                        setStepEditingId(step.id);
                        setEditStepForm(toStepForm(step));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dangerButton"
                      disabled={stepSaving}
                      onClick={() => void handleDeleteStep(step.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="stepEditor">
                    <div className="fieldGrid">
                      <label className="field">
                        <span>Description</span>
                        <input
                          value={editStepForm.description}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Temperature</span>
                        <input
                          value={editStepForm.llm_temperature}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              llm_temperature: event.target.value,
                            }))
                          }
                          placeholder="Optional"
                        />
                      </label>
                    </div>
                    <div className="fieldGrid">
                      <label className="field">
                        <span>Model</span>
                        <select
                          value={editStepForm.llm_model_id}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              llm_model_id: event.target.value,
                            }))
                          }
                        >
                          {llmModels.map((modelRow) => (
                            <option key={modelRow.id} value={modelRow.id}>
                              {modelRow.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Step type</span>
                        <select
                          value={editStepForm.humor_flavor_step_type_id}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              humor_flavor_step_type_id: event.target.value,
                            }))
                          }
                        >
                          {stepTypes.map((row) => (
                            <option key={row.id} value={row.id}>
                              {getLookupLabel(row)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Input type</span>
                        <select
                          value={editStepForm.llm_input_type_id}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              llm_input_type_id: event.target.value,
                            }))
                          }
                        >
                          {inputTypes.map((row) => (
                            <option key={row.id} value={row.id}>
                              {getLookupLabel(row)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Output type</span>
                        <select
                          value={editStepForm.llm_output_type_id}
                          onChange={(event) =>
                            setEditStepForm((current) => ({
                              ...current,
                              llm_output_type_id: event.target.value,
                            }))
                          }
                        >
                          {outputTypes.map((row) => (
                            <option key={row.id} value={row.id}>
                              {getLookupLabel(row)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>System prompt</span>
                      <textarea
                        rows={7}
                        value={editStepForm.llm_system_prompt}
                        onChange={(event) =>
                          setEditStepForm((current) => ({
                            ...current,
                            llm_system_prompt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>User prompt</span>
                      <textarea
                        rows={9}
                        value={editStepForm.llm_user_prompt}
                        onChange={(event) =>
                          setEditStepForm((current) => ({
                            ...current,
                            llm_user_prompt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="rowActions">
                      <button
                        type="button"
                        className="primaryButton"
                        disabled={stepSaving}
                        onClick={() => void handleSaveStep(step.id)}
                      >
                        {stepSaving ? "Saving..." : "Save step"}
                      </button>
                      <button type="button" className="ghostButton" onClick={() => setStepEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="stepMetaGrid">
                      <div>
                        <span>Type</span>
                        <strong>{getLookupLabel(stepType)}</strong>
                      </div>
                      <div>
                        <span>Model</span>
                        <strong>{model?.name || `#${step.llm_model_id}`}</strong>
                      </div>
                      <div>
                        <span>Input</span>
                        <strong>{getLookupLabel(inputType)}</strong>
                      </div>
                      <div>
                        <span>Output</span>
                        <strong>{getLookupLabel(outputType)}</strong>
                      </div>
                      <div>
                        <span>Temperature</span>
                        <strong>{step.llm_temperature ?? "Default"}</strong>
                      </div>
                      <div>
                        <span>Order</span>
                        <strong>{step.order_by}</strong>
                      </div>
                    </div>
                    <div className="promptGrid">
                      <div className="promptBlock">
                        <span>System prompt</span>
                        <pre>{step.llm_system_prompt || "No system prompt."}</pre>
                      </div>
                      <div className="promptBlock">
                        <span>User prompt</span>
                        <pre>{step.llm_user_prompt || "No user prompt."}</pre>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>

        <form className="panel nestedPanel" onSubmit={handleCreateStep}>
          <div className="panelHeader">
            <div>
              <h3>Add step</h3>
              <p className="muted sectionNote">New steps are appended to the end of the flavor chain.</p>
            </div>
            <span className="panelTag">Create</span>
          </div>
          <div className="fieldGrid">
            <label className="field">
              <span>Description</span>
              <input
                value={createStepForm.description}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Temperature</span>
              <input
                value={createStepForm.llm_temperature}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    llm_temperature: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="fieldGrid">
            <label className="field">
              <span>Model</span>
              <select
                value={createStepForm.llm_model_id}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    llm_model_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select a model</option>
                {llmModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Step type</span>
              <select
                value={createStepForm.humor_flavor_step_type_id}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    humor_flavor_step_type_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select a step type</option>
                {stepTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {getLookupLabel(row)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Input type</span>
              <select
                value={createStepForm.llm_input_type_id}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    llm_input_type_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select input type</option>
                {inputTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {getLookupLabel(row)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Output type</span>
              <select
                value={createStepForm.llm_output_type_id}
                onChange={(event) =>
                  setCreateStepForm((current) => ({
                    ...current,
                    llm_output_type_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select output type</option>
                {outputTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {getLookupLabel(row)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>System prompt</span>
            <textarea
              rows={6}
              value={createStepForm.llm_system_prompt}
              onChange={(event) =>
                setCreateStepForm((current) => ({
                  ...current,
                  llm_system_prompt: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>User prompt</span>
            <textarea
              rows={8}
              value={createStepForm.llm_user_prompt}
              onChange={(event) =>
                setCreateStepForm((current) => ({
                  ...current,
                  llm_user_prompt: event.target.value,
                }))
              }
            />
          </label>
          <button type="submit" className="primaryButton" disabled={stepSaving}>
            {stepSaving ? "Saving..." : "Create step"}
          </button>
        </form>
      </section>
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
