import { api } from "@/lib/utils/api";
import type {
  ProjectSettingsResponse,
  ProjectSettingsByEnvironmentResponse,
  ProjectSettingDataType,
  SettingMutationResponse,
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

  createSetting(
    projectId: string,
    organizationId: string,
    key: string,
    description: string | null,
    dataType: ProjectSettingDataType,
    isSecret: boolean
  ): Promise<SettingMutationResponse> {
    return api.post<SettingMutationResponse>(
      `/api/projects/${projectId}/settings`,
      { organizationId, key, description, dataType, isSecret }
    );
  },

  createValue(
    projectId: string,
    settingId: string,
    environmentId: string,
    organizationId: string,
    value: string | null
  ): Promise<SettingMutationResponse> {
    return api.post<SettingMutationResponse>(
      `/api/projects/${projectId}/settings/${settingId}/values/${environmentId}`,
      { organizationId, value }
    );
  },

  updateValue(
    projectId: string,
    settingId: string,
    environmentId: string,
    organizationId: string,
    value: string | null
  ): Promise<SettingMutationResponse> {
    return api.put<SettingMutationResponse>(
      `/api/projects/${projectId}/settings/${settingId}/values/${environmentId}`,
      { organizationId, value }
    );
  },
};
