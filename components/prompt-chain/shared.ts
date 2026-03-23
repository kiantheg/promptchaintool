import type {
  GeneratedCaptionRow,
  HumorFlavor,
  HumorFlavorStep,
  LookupRow,
} from "@/lib/supabase-rest";

export type FlavorFormState = {
  slug: string;
  description: string;
};

export type StepFormState = {
  description: string;
  llm_system_prompt: string;
  llm_user_prompt: string;
  llm_temperature: string;
  llm_model_id: string;
  llm_input_type_id: string;
  llm_output_type_id: string;
  humor_flavor_step_type_id: string;
};

export type ThemeMode = "system" | "light" | "dark";

export const EMPTY_FLAVOR_FORM: FlavorFormState = {
  slug: "",
  description: "",
};

export const EMPTY_STEP_FORM: StepFormState = {
  description: "",
  llm_system_prompt: "",
  llm_user_prompt: "",
  llm_temperature: "",
  llm_model_id: "",
  llm_input_type_id: "",
  llm_output_type_id: "",
  humor_flavor_step_type_id: "",
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export function relativeDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getGeneratedLines(rows: GeneratedCaptionRow[]) {
  return rows
    .map((row) => row.content?.trim() ?? "")
    .filter((value) => Boolean(value));
}

export function toFlavorForm(flavor: HumorFlavor): FlavorFormState {
  return {
    slug: flavor.slug,
    description: flavor.description ?? "",
  };
}

export function toStepForm(step: HumorFlavorStep): StepFormState {
  return {
    description: step.description ?? "",
    llm_system_prompt: step.llm_system_prompt ?? "",
    llm_user_prompt: step.llm_user_prompt ?? "",
    llm_temperature:
      step.llm_temperature === null || step.llm_temperature === undefined
        ? ""
        : String(step.llm_temperature),
    llm_model_id: String(step.llm_model_id),
    llm_input_type_id: String(step.llm_input_type_id),
    llm_output_type_id: String(step.llm_output_type_id),
    humor_flavor_step_type_id: String(step.humor_flavor_step_type_id),
  };
}

export function getLookupLabel(row: LookupRow | undefined) {
  if (!row) return "Unknown";
  return row.description?.trim() || row.slug;
}
