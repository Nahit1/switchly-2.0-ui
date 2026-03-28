/* ── Enums ─────────────────────────────────────────────────────── */
// C# enum: String = 0, Boolean = 1, Integer = 2, Double = 3
export type SegmentValueType = 0 | 1 | 2 | 3 | "String" | "Boolean" | "Integer" | "Double" | string;

/* ── Segment Rule ───────────────────────────────────────────────── */
export interface SegmentRuleDto {
  id?: string;
  traitKey?: string;
  operator?: string;
  value?: string | null;
  valueType?: SegmentValueType;
  sortOrder?: number;
  [key: string]: unknown;
}

/* ── Segment Group ──────────────────────────────────────────────── */
export interface SegmentGroupDto {
  id?: string;
  name?: string;
  key?: string;
  description?: string;
  organizationId?: string;
  segmentRules?: SegmentRuleDto[];
  [key: string]: unknown;
}

/* ── Responses ──────────────────────────────────────────────────── */
export interface SegmentListResponse {
  success: boolean;
  data?: SegmentGroupDto[];
  message?: string;
}

export interface SegmentRuleListResponse {
  success: boolean;
  data?: SegmentRuleDto[];
  message?: string;
}

export interface SegmentServiceResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

/* ── Create Rule Body ───────────────────────────────────────────── */
export interface CreateSegmentRuleBody {
  traitKey: string;
  operator: string;
  value?: string | null;
  valueType: SegmentValueType;
  sortOrder: number;
}
