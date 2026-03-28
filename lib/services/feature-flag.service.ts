import { api } from "@/lib/utils/api";
import type { FlagListResponse, FeatureFlagType, RolloutKind } from "@/lib/types/feature-flag";

export interface FlagServiceResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const featureFlagService = {
  getByProject(
    organizationId: string,
    projectId: string
  ): Promise<FlagListResponse> {
    return api.get<FlagListResponse>(
      `/api/flag/get-by-project?organizationId=${organizationId}&projectId=${projectId}`
    );
  },

  create(
    organizationId: string,
    projectId: string,
    key: string,
    name: string,
    description: string,
    type: FeatureFlagType
  ): Promise<FlagServiceResponse> {
    return api.post<FlagServiceResponse>("/api/flag/create", {
      organizationId,
      projectId,
      key,
      name,
      description,
      type,
    });
  },

  toggle(
    flagId: string,
    featureFlagEnvId: string,
    organizationId: string,
    projectId: string,
    isEnabled: boolean
  ): Promise<FlagServiceResponse> {
    return api.put<FlagServiceResponse>(
      `/api/flags/${flagId}/environments/${featureFlagEnvId}/toggle`,
      { organizationId, projectId, isEnabled }
    );
  },

  updateFlagEnvironment(
    featureFlagId: string,
    projectEnvironmentId: string,
    isEnabled: boolean,
    defaultRolloutKind: RolloutKind,
    defaultRolloutPercentage: number
  ): Promise<FlagServiceResponse> {
    return api.put<FlagServiceResponse>(
      "/api/environments/update-flag-enviroment",
      { featureFlagId, projectEnvironmentId, isEnabled, defaultRolloutKind, defaultRolloutPercentage }
    );
  },

  assignSegment(
    featureFlagEnvironmentId: string,
    segmentGroupId: string
  ): Promise<FlagServiceResponse> {
    return api.post<FlagServiceResponse>("/api/flag-environments/segments", {
      featureFlagEnvironmentId,
      segmentGroupId,
    });
  },
};
