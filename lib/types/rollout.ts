export type RolloutScheduleStatus =
  | "Draft"
  | "Active"
  | "Paused"
  | "Completed"
  | "RolledBack"
  | string;

export interface RolloutScheduleStepDto {
  stepIndex: number;
  percentage: number;
  durationMinutes: number;
  promotedAt?: string | null;
}

export interface RolloutScheduleDto {
  id: string;
  featureFlagEnvironmentId: string;
  targetVariantId?: string | null;
  targetVariantKey?: string | null;
  status: RolloutScheduleStatus;
  currentStepIndex: number;
  startedAt?: string | null;
  lastTransitionAt?: string | null;
  pausedAt?: string | null;
  nextPromoteAt?: string | null;
  steps: RolloutScheduleStepDto[];
  // Seviye 2 guardrail alanları (opsiyonel — GetRolloutSchedule henüz döndürmüyor olabilir)
  errorThreshold?: number | null;
  errorWindowMinutes?: number;
  minSeverity?: string | null;
  rolledBackReason?: string | null;
}

export interface RolloutScheduleResponse {
  success: boolean;
  data?: RolloutScheduleDto | null;
  message?: string;
}

export interface RolloutStepInput {
  percentage: number;
  durationMinutes: number;
}

export interface CreateRolloutScheduleResponse {
  success: boolean;
  data?: { scheduleId: string };
  message?: string;
}

export interface RolloutSimpleResponse {
  success: boolean;
  data?: boolean;
  message?: string;
}
