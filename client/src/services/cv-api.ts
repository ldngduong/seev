import { apiClient } from "./api-client";
import type { CvUploadValues } from "@/schemas/cv-audit.schema";
import type { AuditSummary } from "@/types/cv";

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
