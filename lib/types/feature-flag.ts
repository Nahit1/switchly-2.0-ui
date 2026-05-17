/* ── Enums ─────────────────────────────────────────────────────── */
// C# enum: Boolean = 1, Multivariant = 2, Config = 3
export type FeatureFlagType = 1 | 2 | 3 | "Boolean" | "Multivariant" | "Config";
// C# enum: AllUsers = 1, Percentage = 2, Off = 3
export type RolloutKind = 1 | 2 | 3 | "AllUsers" | "Percentage" | "Off" | string;
// C# enum: And = 1, Or = 2, Not = 3
export type LogicalOperator = 1 | 2 | 3 | "And" | "Or" | "Not";

/* ── Segment ───────────────────────────────────────────────────── */
export interface SegmentRuleDto {
  traitKey?: string;
  operator?: string;
  value?: string;
  [key: string]: unknown;
}

export interface SegmentGroupsDto {
  id?: string;                       // FeatureFlagSegmentTargeting.Id (update için)
  name?: string;
  key?: string;
  description?: string;
  logicalOperator?: LogicalOperator;
  rolloutKind?: RolloutKind;
  rolloutPercentage?: number;
  priority?: number;
  isEnabled?: boolean;
  segmentRules?: SegmentRuleDto[];
  variantWeights?: VariantWeightDto[];
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
  variantWeights?: VariantWeightDto[];
  [key: string]: unknown;
}

/* ── Variant ───────────────────────────────────────────────────── */
export interface GetFlagVariantDto {
  id?: string;
  key?: string;
  name?: string;
  payloadJson?: string;
  sortOrder?: number;
  [key: string]: unknown;
}

export interface VariantInput {
  key: string;
  name?: string;
  payloadJson?: string;
}

export interface VariantWeightDto {
  variantId: string;
  weight: number;
  [key: string]: unknown;
}

export interface VariantWeightInput {
  variantId: string;
  weight: number;
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

/* ── Exposure analytics ────────────────────────────────────────── */
export interface VariantExposureStatsDto {
  variantId?: string | null;
  variantKey?: string | null;
  isOn: boolean;
  totalExposures: number;
  uniqueUsers: number;
  [key: string]: unknown;
}

export interface FlagExposureStatsDto {
  flagId: string;
  flagKey: string;
  since: string;
  totalExposures: number;
  uniqueUsers: number;
  variants: VariantExposureStatsDto[];
  [key: string]: unknown;
}

export interface FlagExposureStatsResponse {
  success: boolean;
  data?: FlagExposureStatsDto;
  message?: string;
}

/* ── Conversion analytics ──────────────────────────────────────── */
export interface VariantConversionStatsDto {
  variantId?: string | null;
  variantKey?: string | null;
  isOn: boolean;
  exposedUsers: number;
  convertedUsers: number;
  totalValue: number;
  // Statistical significance — backend hesaplıyor (z-test).
  pValue?: number | null;            // null = baseline veya hesap yapılamadı
  isSignificant: boolean;             // p < 0.05 → true
  liftPercent?: number | null;        // (variantRate - baselineRate) / baselineRate * 100
  liftCiLowPercent?: number | null;   // %95 güven aralığı alt sınır
  liftCiHighPercent?: number | null;  // üst sınır
  isBaseline: boolean;                // bu satır baseline mı (UI badge için)
  [key: string]: unknown;
}

export interface FlagConversionStatsDto {
  flagId: string;
  flagKey: string;
  eventName: string;
  since: string;
  totalExposedUsers: number;
  totalConvertedUsers: number;
  totalValue: number;
  variants: VariantConversionStatsDto[];
  [key: string]: unknown;
}

export interface FlagConversionStatsResponse {
  success: boolean;
  data?: FlagConversionStatsDto;
  message?: string;
}
