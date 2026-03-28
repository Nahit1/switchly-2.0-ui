import { api } from "@/lib/utils/api";
import type { ProjectListResponse, CreateProjectResponse } from "@/lib/types/project";

export const projectService = {
  getByOrganization(organizationId: string): Promise<ProjectListResponse> {
    return api.get<ProjectListResponse>(
      `/api/project/get-projects-by-organization?OrganizationId=${organizationId}`
    );
  },

  create(
    organizationId: string,
    name: string,
    description: string
  ): Promise<CreateProjectResponse> {
    return api.post<CreateProjectResponse>("/api/project/create", {
      organizationId,
      name,
      description,
    });
  },
};
