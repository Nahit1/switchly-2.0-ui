/* ── Enums ─────────────────────────────────────────────────────── */
// C# enum: Boolean = 1, Multivariant = 2, Config = 3
export type FeatureFlagType = 1 | 2 | 3 | "Boolean" | "Multivariant" | "Config";
// C# enum: AllUsers = 1, Percentage = 2, Off = 3
export type RolloutKind = 1 | 2 | 3 | "AllUsers" | "Percentage" | "Off" | string;

/* ── Segment ───────────────────────────────────────────────────── */
export interface SegmentRuleDto {
  traitKey?: string;
  operator?: string;
  value?: string;
  [key: string]: unknown;
}

export interface SegmentGroupsDto {
  id?: string;
  name?: string;
  key?: string;
  description?: string;
  segmentRules?: SegmentRuleDto[];
  [key: string]: unknown;
}

/* ── Environment ───────────────────────────────────────────────── */
export interface GetFlagEnvironmentDto {
  projectEnvironmentId?: string;
  featureFlagEnvironmentId?: string;
  environmentKey?: string;
  environmentName?: string;
  isEnabled?: boolean;
  defaultRolloutKind?: RolloutKind;
  defaultRolloutPercentage?: number;
  segmentGroups?: SegmentGroupsDto[];
  [key: string]: unknown;
}

/* ── Variant ───────────────────────────────────────────────────── */
export interface GetFlagVariantDto {
  id?: string;
  key?: string;
  name?: string;
  payloadJson?: string;
  [key: string]: unknown;
}

/* ── Flag ──────────────────────────────────────────────────────── */
export interface GetFlagByProjectDto {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  type?: FeatureFlagType;
  createdAt?: string;
  environments?: GetFlagEnvironmentDto[];
  variants?: GetFlagVariantDto[];
  [key: string]: unknown;
}

export interface FlagListResponse {
  success: boolean;
  data?: GetFlagByProjectDto[];
  message?: string;
}
