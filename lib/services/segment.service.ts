import { api } from "@/lib/utils/api";
import type {
  SegmentListResponse,
  SegmentRuleListResponse,
  SegmentServiceResponse,
  CreateSegmentRuleBody,
  LogicalOperator,
} from "@/lib/types/segment";

export const segmentService = {
  getAllGroups(organizationId: string): Promise<SegmentListResponse> {
    return api.get<SegmentListResponse>(
      `/api/segments?organizationId=${organizationId}`
    );
  },

  getRules(segmentGroupId: string): Promise<SegmentRuleListResponse> {
    return api.get<SegmentRuleListResponse>(
      `/api/segments/${segmentGroupId}/rules`
    );
  },

  createGroup(
    organizationId: string,
    key: string,
    name: string,
    description?: string | null,
    logicalOperator: LogicalOperator = 1
  ): Promise<SegmentServiceResponse> {
    return api.post<SegmentServiceResponse>("/api/segments", {
      organizationId,
      key,
      name,
      description: description ?? null,
      logicalOperator,
    });
  },

  createRule(
    segmentGroupId: string,
    body: CreateSegmentRuleBody
  ): Promise<SegmentServiceResponse> {
    return api.post<SegmentServiceResponse>(
      `/api/segments/${segmentGroupId}/rules`,
      body
    );
  },

  removeGroup(segmentGroupId: string): Promise<SegmentServiceResponse> {
    return api.delete<SegmentServiceResponse>(
      `/api/segments/${segmentGroupId}`
    );
  },

  removeRule(ruleId: string): Promise<SegmentServiceResponse> {
    return api.delete<SegmentServiceResponse>(
      `/api/segments/rules/${ruleId}`
    );
  },
};
