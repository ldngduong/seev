import { apiClient } from "@/shared/lib/api-client";
import type { JobCategoryGroup, JobCategorySearchResult, SeniorityLevel } from '@/entities/career-taxonomy/types/career-taxonomy.types'

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
