import { api } from "@/lib/utils/api";
import type {
  RolloutScheduleResponse,
  CreateRolloutScheduleResponse,
  RolloutSimpleResponse,
  RolloutStepInput,
} from "@/lib/types/rollout";

export const rolloutService = {
  getByEnvironment(flagEnvironmentId: string): Promise<RolloutScheduleResponse> {
    return api.get<RolloutScheduleResponse>(
      `/api/flag-environment/${flagEnvironmentId}/rollout-schedule`
    );
  },

  create(
    flagEnvironmentId: string,
    targetVariantId: string | null,
    steps: RolloutStepInput[],
    guardrail?: {
      errorThreshold?: number | null;
      errorWindowMinutes?: number | null;
      minSeverity?: string | null;
    }
  ): Promise<CreateRolloutScheduleResponse> {
    return api.post<CreateRolloutScheduleResponse>(
      `/api/flag-environment/${flagEnvironmentId}/rollout-schedule`,
      {
        targetVariantId,
        steps,
        errorThreshold: guardrail?.errorThreshold,
        errorWindowMinutes: guardrail?.errorWindowMinutes,
        minSeverity: guardrail?.minSeverity,
      }
    );
  },

  pause(scheduleId: string): Promise<RolloutSimpleResponse> {
    return api.put<RolloutSimpleResponse>(
      `/api/rollout-schedule/${scheduleId}/pause`,
      {}
    );
  },

  resume(scheduleId: string): Promise<RolloutSimpleResponse> {
    return api.put<RolloutSimpleResponse>(
      `/api/rollout-schedule/${scheduleId}/resume`,
      {}
    );
  },

  rollback(scheduleId: string): Promise<RolloutSimpleResponse> {
    return api.post<RolloutSimpleResponse>(
      `/api/rollout-schedule/${scheduleId}/rollback`,
      {}
    );
  },
};
