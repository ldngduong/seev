import { apiClient } from "@/shared/lib/api-client";
import type {
  CvResearchSession,
  UserCv,
} from "@/entities/cv/types/cv.types";
import type { CvListQuery, PaginatedResponse, ResearchSessionListQuery } from '@/entities/cv/types/cv-api.types'

export type { PaginatedResponse } from '@/entities/cv/types/cv-api.types'

export async function uploadUserCv(values: { file: File; name?: string }) {
  const formData = new FormData();
  formData.append("resume", values.file);
  if (values.name) {
    formData.append("name", values.name);
  }

  const { data } = await apiClient.post<UserCv>("/cv/my-cvs", formData);
  return data;
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
  jobCategoryId?: string;
  seniorityLevelId?: string;
  targetRole?: string;
  locations?: string[];
}) {
  const { data } = await apiClient.post<CvResearchSession>(
    "/cv/research/custom",
    values,
  );

  return data;
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
