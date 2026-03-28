import { api } from "@/lib/utils/api";
import type { CreateOrganizationResponse, OrganizationListResponse } from "@/lib/types/organization";

export const organizationService = {
  getAll(): Promise<OrganizationListResponse> {
    return api.get<OrganizationListResponse>("/api/organization/getAll");
  },

  create(name: string): Promise<CreateOrganizationResponse> {
    return api.post<CreateOrganizationResponse>("/api/organization/create", { name });
  },
};
