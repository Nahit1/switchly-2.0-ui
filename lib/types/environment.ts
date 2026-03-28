export interface ProjectEnvironment {
  id?: string;
  key?: string;
  name?: string;
  sortOrder?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface EnvironmentListResponse {
  success: boolean;
  data?: ProjectEnvironment[];
  message?: string;
}
