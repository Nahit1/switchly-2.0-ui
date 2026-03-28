import { api } from "@/lib/utils/api";
import type { EnvironmentListResponse } from "@/lib/types/environment";

export const environmentService = {
  getByProject(
    projectId: string,
    organizationId: string
  ): Promise<EnvironmentListResponse> {
    return api.get<EnvironmentListResponse>(
      `/api/projects/${projectId}/environments?organizationId=${organizationId}`
    );
  },
};
