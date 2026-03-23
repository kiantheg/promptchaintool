const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }
}

function getSupabaseConfig() {
  assertSupabaseConfig();
  return {
    url: supabaseUrl as string,
    anonKey: supabaseAnonKey as string,
  };
}

type JsonRecord = Record<string, unknown>;

const AUDIT_FIELD_KEYS = new Set([
  "created_by_user_id",
  "modified_by_user_id",
  "created_datetime_utc",
  "modified_datetime_utc",
]);

function withoutAuditFields(payload: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !AUDIT_FIELD_KEYS.has(key)),
  );
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: JsonRecord;
  query?: string;
  prefer?: string;
};

async function supabaseRequest<T>(
  path: string,
  { method = "GET", token, body, query, prefer }: RequestOptions = {},
): Promise<T> {
  const { url: baseUrl, anonKey } = getSupabaseConfig();
  const queryString = query ? `?${query}` : "";
  const url = `${baseUrl}${path}${queryString}`;

  const response = await fetch(url, {
    method,
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorBody}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function pagedSelect<T>(
  token: string,
  table: string,
  select: string,
  order: string | null,
  page: number,
  pageSize: number,
  filters: string[] = [],
) {
  const { url, anonKey } = getSupabaseConfig();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 200);
  const from = (safePage - 1) * safePageSize;
  const orderQuery = order ? `&order=${encodeURIComponent(order)}` : "";
  const filterQuery = filters.length > 0 ? `&${filters.join("&")}` : "";
  const query = `select=${select}${orderQuery}${filterQuery}&limit=${safePageSize}&offset=${from}`;

  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorBody}`);
  }

  const rows = (await response.json()) as T[];
  const range = response.headers.get("content-range");
  const totalRaw = range?.split("/")[1] ?? "0";
  const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : 0;

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

export type Profile = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_superadmin?: boolean | null;
  is_matrix_admin?: boolean | null;
};

export type HumorFlavor = {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
};

export type HumorFlavorStep = {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  llm_temperature: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
};

export type LookupRow = {
  id: number;
  slug: string;
  description: string | null;
};

export type LlmModel = {
  id: number;
  name: string;
  provider_model_id: string;
  is_temperature_supported: boolean;
};

export type ImageOption = {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
  created_datetime_utc: string | null;
};

export type CaptionHistoryRow = {
  id: string;
  content: string | null;
  image_id: string;
  humor_flavor_id: number | null;
  caption_request_id: number | null;
  llm_prompt_chain_id: number | null;
  created_datetime_utc: string | null;
  images?: { url: string | null } | Array<{ url: string | null }> | null;
};

export type LlmResponseRow = {
  id: string;
  caption_request_id: number;
  humor_flavor_id: number;
  humor_flavor_step_id: number | null;
  llm_model_id: number;
  llm_model_response: string | null;
  processing_time_seconds: number | null;
  created_datetime_utc: string | null;
};

export type GeneratedCaptionRow = {
  id?: string;
  content?: string | null;
};

const PIPELINE_API_BASE = "https://api.almostcrackd.ai";

export function extractImageUrl(row: CaptionHistoryRow | ImageOption | Record<string, unknown>) {
  if ("images" in row && row.images) {
    if (Array.isArray(row.images)) return row.images[0]?.url ?? null;
    const relation = row.images as { url?: string | null };
    return relation.url ?? null;
  }

  const genericRow = row as Record<string, unknown>;
  const candidates = ["url", "cdn_url", "image_url", "public_url"];
  for (const key of candidates) {
    const value = genericRow[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function getMyProfile(token: string, userId: string) {
  const profiles = await supabaseRequest<Profile[]>("/rest/v1/profiles", {
    token,
    query: `select=id,email,first_name,last_name,is_superadmin,is_matrix_admin&id=eq.${encodeURIComponent(
      userId,
    )}&limit=1`,
  });

  return profiles[0] ?? null;
}

export async function listHumorFlavors(token: string) {
  return await supabaseRequest<HumorFlavor[]>("/rest/v1/humor_flavors", {
    token,
    query:
      "select=id,slug,description,created_datetime_utc,modified_datetime_utc&order=modified_datetime_utc.desc.nullslast,created_datetime_utc.desc.nullslast",
  });
}

export async function createHumorFlavor(
  token: string,
  actingUserId: string,
  payload: Pick<HumorFlavor, "slug" | "description">,
) {
  return await supabaseRequest<HumorFlavor[]>("/rest/v1/humor_flavors", {
    method: "POST",
    token,
    prefer: "return=representation",
    body: {
      ...withoutAuditFields(payload),
      created_by_user_id: actingUserId,
      modified_by_user_id: actingUserId,
    },
  });
}

export async function updateHumorFlavor(
  token: string,
  actingUserId: string,
  flavorId: number,
  payload: Pick<HumorFlavor, "slug" | "description">,
) {
  return await supabaseRequest<HumorFlavor[]>("/rest/v1/humor_flavors", {
    method: "PATCH",
    token,
    prefer: "return=representation",
    query: `id=eq.${flavorId}`,
    body: {
      ...withoutAuditFields(payload),
      modified_by_user_id: actingUserId,
    },
  });
}

export async function deleteHumorFlavor(token: string, flavorId: number) {
  await supabaseRequest<null>("/rest/v1/humor_flavors", {
    method: "DELETE",
    token,
    query: `id=eq.${flavorId}`,
  });
}

export async function listHumorFlavorSteps(token: string, flavorId: number) {
  return await supabaseRequest<HumorFlavorStep[]>("/rest/v1/humor_flavor_steps", {
    token,
    query: `select=id,humor_flavor_id,order_by,llm_temperature,llm_input_type_id,llm_output_type_id,llm_model_id,humor_flavor_step_type_id,llm_system_prompt,llm_user_prompt,description,created_datetime_utc,modified_datetime_utc&humor_flavor_id=eq.${flavorId}&order=order_by.asc,id.asc`,
  });
}

type StepPayload = Pick<
  HumorFlavorStep,
  | "humor_flavor_id"
  | "order_by"
  | "llm_temperature"
  | "llm_input_type_id"
  | "llm_output_type_id"
  | "llm_model_id"
  | "humor_flavor_step_type_id"
  | "llm_system_prompt"
  | "llm_user_prompt"
  | "description"
>;

export async function createHumorFlavorStep(
  token: string,
  actingUserId: string,
  payload: StepPayload,
) {
  return await supabaseRequest<HumorFlavorStep[]>("/rest/v1/humor_flavor_steps", {
    method: "POST",
    token,
    prefer: "return=representation",
    body: {
      ...withoutAuditFields(payload),
      created_by_user_id: actingUserId,
      modified_by_user_id: actingUserId,
    },
  });
}

export async function updateHumorFlavorStep(
  token: string,
  actingUserId: string,
  stepId: number,
  payload: Partial<StepPayload>,
) {
  return await supabaseRequest<HumorFlavorStep[]>("/rest/v1/humor_flavor_steps", {
    method: "PATCH",
    token,
    prefer: "return=representation",
    query: `id=eq.${stepId}`,
    body: {
      ...withoutAuditFields(payload),
      modified_by_user_id: actingUserId,
    },
  });
}

export async function deleteHumorFlavorStep(token: string, stepId: number) {
  await supabaseRequest<null>("/rest/v1/humor_flavor_steps", {
    method: "DELETE",
    token,
    query: `id=eq.${stepId}`,
  });
}

export async function listLlmModels(token: string) {
  return await supabaseRequest<LlmModel[]>("/rest/v1/llm_models", {
    token,
    query:
      "select=id,name,provider_model_id,is_temperature_supported&order=name.asc",
  });
}

export async function listLookupRows(token: string, table: string) {
  return await supabaseRequest<LookupRow[]>(`/rest/v1/${table}`, {
    token,
    query: "select=id,slug,description&order=id.asc",
  });
}

export async function listImageOptions(token: string, page = 1, pageSize = 18) {
  const result = await pagedSelect<ImageOption>(
    token,
    "images",
    "id,url,image_description,is_common_use,created_datetime_utc",
    "is_common_use.desc,created_datetime_utc.desc",
    page,
    pageSize,
    ["is_public=eq.true"],
  );

  return result.rows.filter((row) => Boolean(extractImageUrl(row)));
}

export async function listFlavorCaptions(token: string, flavorId: number, limit = 24) {
  return await supabaseRequest<CaptionHistoryRow[]>("/rest/v1/captions", {
    token,
    query: `select=id,content,image_id,humor_flavor_id,caption_request_id,llm_prompt_chain_id,created_datetime_utc,images(url)&humor_flavor_id=eq.${flavorId}&order=created_datetime_utc.desc&limit=${limit}`,
  });
}

export async function listFlavorResponses(token: string, flavorId: number, limit = 18) {
  return await supabaseRequest<LlmResponseRow[]>("/rest/v1/llm_model_responses", {
    token,
    query: `select=id,caption_request_id,humor_flavor_id,humor_flavor_step_id,llm_model_id,llm_model_response,processing_time_seconds,created_datetime_utc&humor_flavor_id=eq.${flavorId}&order=created_datetime_utc.desc&limit=${limit}`,
  });
}

export async function generateCaptions(
  token: string,
  imageId: string,
  humorFlavorId: number,
) {
  const response = await fetch(`${PIPELINE_API_BASE}/pipeline/generate-captions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageId, humorFlavorId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Caption generation failed (${response.status}): ${body}`);
  }

  return (await response.json()) as GeneratedCaptionRow[];
}
