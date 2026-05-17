// C# enum: String=1, Number=2, Boolean=3, Json=4
export type ProjectSettingDataType =
  | 1 | 2 | 3 | 4
  | "String" | "Number" | "Boolean" | "Json";

/* ── Legacy types (kept for reference) ────────────────────────── */
export interface ProjectSettingValueDto {
  projectEnvironmentId?: string;
  environmentKey?: string;
  environmentName?: string;
  value?: string | null;
  [key: string]: unknown;
}

export interface ProjectSettingDto {
  id?: string;
  key?: string;
  description?: string;
  dataType?: ProjectSettingDataType;
  isSecret?: boolean;
  values?: ProjectSettingValueDto[];
  [key: string]: unknown;
}

export interface ProjectSettingsResponse {
  success: boolean;
  data?: ProjectSettingDto[];
  message?: string;
}

/* ── Settings by environment ───────────────────────────────────── */
export interface SettingValueDto {
  id?: string;
  value?: string | null;
  [key: string]: unknown;
}

export interface ProjectSettingByEnvironmentDto {
  id?: string;
  key?: string;
  description?: string;
  dataType?: ProjectSettingDataType;
  isSecret?: boolean;
  value?: SettingValueDto | null;
  [key: string]: unknown;
}

export interface ProjectSettingsByEnvironmentResponse {
  success: boolean;
  data?: ProjectSettingByEnvironmentDto[];
  message?: string;
}

/* ── Mutations ────────────────────────────────────────────────── */
export interface SettingMutationResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}
