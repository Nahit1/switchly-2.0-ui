export interface Project {
  id?: string;
  organizationName?: string;
  name?: string;
  key?: string;
  description?: string;
  createdAt?: string;
  // Backend may use different casing
  [key: string]: unknown;
}

export interface ProjectListResponse {
  success: boolean;
  data?: Project[];
  message?: string;
}

export interface CreateProjectResponse {
  success: boolean;
  data?: Project;
  message?: string;
}
