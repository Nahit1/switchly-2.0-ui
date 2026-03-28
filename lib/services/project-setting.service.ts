import { api } from "@/lib/utils/api";
import type {
  ProjectSettingsResponse,
  ProjectSettingsByEnvironmentResponse,
} from "@/lib/types/project-setting";

export const projectSettingService = {
  getByProject(
    projectId: string,
    organizationId: string
  ): Promise<ProjectSettingsResponse> {
    return api.get<ProjectSettingsResponse>(
      `/api/projects/${projectId}/settings?organizationId=${organizationId}`
    );
  },

  getByEnvironment(
    projectId: string,
    organizationId: string,
    environmentId: string
  ): Promise<ProjectSettingsByEnvironmentResponse> {
    return api.get<ProjectSettingsByEnvironmentResponse>(
      `/api/projects/${projectId}/settingsbyenvironment?organizationId=${organizationId}&environmentId=${environmentId}`
    );
  },
};
