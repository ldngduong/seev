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

export async function listUserCvs() {
  const { data } = await apiClient.get<UserCv[]>("/cv/my-cvs");
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

export async function listCvResearchSessions(limit = 30) {
  const { data } = await apiClient.get<CvResearchSession[]>(
    "/cv/research-sessions",
    {
      params: { limit },
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
