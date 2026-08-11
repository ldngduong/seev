import { apiClient } from "./api-client";

export interface JobCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface JobCategoryGroup {
  code: string;
  name: string;
  display_order: number;
  categories: JobCategory[];
}

export interface JobCategorySearchResult extends JobCategory {
  group: { code: string; name: string };
}

export interface SeniorityLevel {
  id: string;
  code: string;
  track: "entry" | "ic" | "senior_ic" | "technical_leadership" | "people_management";
  name: string;
  displayName: string;
  description: string | null;
  displayOrder: number;
  rankInTrack: number;
  experienceMin: number | null;
  experienceMax: number | null;
  isActive: boolean;
}

export async function getJobCategoryTree() {
  const { data } = await apiClient.get<JobCategoryGroup[]>(
    "/job-categories/tree",
  );
  return data;
}

export async function searchJobCategories(query: string) {
  const { data } = await apiClient.get<JobCategorySearchResult[]>(
    "/job-categories/search",
    { params: { q: query } },
  );
  return data;
}

export async function getSeniorityLevels(categoryId?: string) {
  const { data } = await apiClient.get<SeniorityLevel[]>("/seniority-levels", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data;
}
