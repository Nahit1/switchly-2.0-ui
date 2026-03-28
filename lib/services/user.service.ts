import { api } from "@/lib/utils/api";

interface CheckOrgResponse {
  success: boolean;
  data?: boolean;
  message?: string;
}

export const userService = {
  async checkHasOrganization(): Promise<boolean> {
    const res = await api.get<CheckOrgResponse>("/api/user/checkUserHasOrganization");
    return res.data === true;
  },
};
