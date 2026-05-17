import { api } from "@/lib/utils/api";
import type {
  FlagListResponse,
  FeatureFlagType,
  RolloutKind,
  VariantInput,
  VariantWeightInput,
  FlagExposureStatsResponse,
  FlagConversionStatsResponse,
} from "@/lib/types/feature-flag";

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
    type: FeatureFlagType,
    variants?: VariantInput[]
  ): Promise<FlagServiceResponse> {
    return api.post<FlagServiceResponse>("/api/flag/create", {
      organizationId,
      projectId,
      key,
      name,
      description,
      type,
      variants: variants && variants.length > 0 ? variants : undefined,
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
    segmentGroupId: string,
    rolloutKind: RolloutKind,
    rolloutPercentage: number,
    priority: number = 0
  ): Promise<FlagServiceResponse> {
    return api.post<FlagServiceResponse>("/api/flag-environments/segments", {
      featureFlagEnvironmentId,
      segmentGroupId,
      rolloutKind,
      rolloutPercentage,
      priority,
    });
  },

  updateTargeting(
    targetingId: string,
    rolloutKind: RolloutKind,
    rolloutPercentage: number,
    priority: number,
    isEnabled: boolean
  ): Promise<FlagServiceResponse> {
    return api.put<FlagServiceResponse>(
      `/api/flag-environments/segments/${targetingId}`,
      { rolloutKind, rolloutPercentage, priority, isEnabled }
    );
  },

  removeTargeting(targetingId: string): Promise<FlagServiceResponse> {
    return api.delete<FlagServiceResponse>(
      `/api/flag-environments/segments/${targetingId}`
    );
  },

  /* ── Variant CRUD ────────────────────────────────────────────── */

  addVariant(
    flagId: string,
    key: string,
    name?: string,
    payloadJson?: string
  ): Promise<FlagServiceResponse> {
    return api.post<FlagServiceResponse>(`/api/flag/${flagId}/variants`, {
      key,
      name,
      payloadJson,
    });
  },

  updateVariant(
    variantId: string,
    name?: string,
    payloadJson?: string
  ): Promise<FlagServiceResponse> {
    return api.patch<FlagServiceResponse>(`/api/variant/${variantId}`, {
      name,
      payloadJson,
    });
  },

  deleteVariant(variantId: string): Promise<FlagServiceResponse> {
    return api.delete<FlagServiceResponse>(`/api/variant/${variantId}`);
  },

  /* ── Variant weights ─────────────────────────────────────────── */

  setEnvVariantWeights(
    flagEnvironmentId: string,
    weights: VariantWeightInput[]
  ): Promise<FlagServiceResponse> {
    return api.put<FlagServiceResponse>(
      `/api/flag/environment/${flagEnvironmentId}/variant-weights`,
      { weights }
    );
  },

  setTargetingVariantWeights(
    targetingId: string,
    weights: VariantWeightInput[]
  ): Promise<FlagServiceResponse> {
    return api.put<FlagServiceResponse>(
      `/api/flag/targeting/${targetingId}/variant-weights`,
      { weights }
    );
  },

  /* ── Exposure analytics ──────────────────────────────────────── */

  getExposureStats(
    flagId: string,
    sinceIsoUtc: string,
    environmentId?: string
  ): Promise<FlagExposureStatsResponse> {
    const params = new URLSearchParams({ since: sinceIsoUtc });
    if (environmentId) params.set("environmentId", environmentId);
    return api.get<FlagExposureStatsResponse>(
      `/api/flag/${flagId}/exposure-stats?${params.toString()}`
    );
  },

  getConversionStats(
    flagId: string,
    eventName: string,
    sinceIsoUtc: string,
    environmentId?: string
  ): Promise<FlagConversionStatsResponse> {
    const params = new URLSearchParams({
      eventName,
      since: sinceIsoUtc,
    });
    if (environmentId) params.set("environmentId", environmentId);
    return api.get<FlagConversionStatsResponse>(
      `/api/flag/${flagId}/conversion-stats?${params.toString()}`
    );
  },
};
