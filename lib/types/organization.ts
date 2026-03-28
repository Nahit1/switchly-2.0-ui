export interface Organization {
  id?: string;
  name?: string;
  publicKey?: string;
  createdAt?: string;
  // Backend may use different casing
  [key: string]: unknown;
}

export interface OrganizationListResponse {
  success: boolean;
  data?: Organization[];
  message?: string;
}

export interface CreateOrganizationResponse {
  success: boolean;
  data?: Organization;
  message?: string;
}
