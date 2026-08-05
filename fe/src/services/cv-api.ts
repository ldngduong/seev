import { apiClient } from "./api-client";
import type { CvUploadValues } from "@/schemas/cv-audit.schema";
import type {
  AuditSummary,
  CvAuditHistoryItem,
  CvResearchSession,
  UserCv,
} from "@/types/cv";

export async function createCvAudit(values: CvUploadValues) {
  const formData = new FormData();
  formData.append("resume", values.resume);
  formData.append("jobCategoryId", String(values.jobCategoryId));
  formData.append("seniorityLevelId", values.seniorityLevelId);
  if (values.targetRole) {
    formData.append("targetRole", values.targetRole);
  }

  const { data } = await apiClient.post<AuditSummary>("/cv/audits", formData);
  return data;
}

export async function listCvAudits(limit = 30) {
  const { data } = await apiClient.get<CvAuditHistoryItem[]>("/cv/audits", {
    params: { limit },
  });

  return data;
}

export async function uploadUserCv(values: { file: File; name?: string }) {
  const formData = new FormData();
  formData.append("resume", values.file);
  if (values.name) {
    formData.append("name", values.name);
  }

  const { data } = await apiClient.post<UserCv>("/cv/my-cvs", formData);
  return data;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PageMeta;
}

export interface CvListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const MAX_CV_PAGE_SIZE = 50;

export async function listUserCvs(query: CvListQuery = {}) {
  const { data } = await apiClient.get<PaginatedResponse<UserCv>>("/cv/my-cvs", {
    params: query,
  });
  return data;
}

export async function getUserCvFile(cvId: string) {
  const { data } = await apiClient.get<Blob>(`/cv/my-cvs/${cvId}/file`, {
    responseType: "blob",
  });

  return data;
}

export async function createQuickCvResearch(userCvId: string) {
  const { data } = await apiClient.post<CvResearchSession>(
    "/cv/research/quick",
    { userCvId },
  );

  return data;
}

export async function createCustomCvResearch(values: {
  userCvId: string;
  jobCategoryId?: number;
  seniorityLevelId?: string;
  targetRole?: string;
  jobDescription?: string;
}) {
  const { data } = await apiClient.post<CvResearchSession>(
    "/cv/research/custom",
    values,
  );

  return data;
}

export interface ResearchSessionListQuery extends CvListQuery {
  type?: 'quick' | 'custom';
  userCvId?: string;
}

export async function listCvResearchSessions(
  query: ResearchSessionListQuery = {},
) {
  const { data } = await apiClient.get<PaginatedResponse<CvResearchSession>>(
    "/cv/research-sessions",
    {
      params: query,
    },
  );

  return data;
}

export async function getCvResearchSession(sessionId: string) {
  const { data } = await apiClient.get<CvResearchSession>(
    `/cv/research-sessions/${sessionId}`,
  );

  return data;
}

export async function retryCvResearchSessionJobs(sessionId: string) {
  const { data } = await apiClient.post<CvResearchSession>(
    `/cv/research-sessions/${sessionId}/job-suggestions/retry`,
  );

  return data;
}

export async function retryCvResearchSession(sessionId: string) {
  const { data } = await apiClient.post<CvResearchSession>(
    `/cv/research-sessions/${sessionId}/retry`,
  );

  return data;
}
