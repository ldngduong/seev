import { apiClient } from "./api-client";

export interface JobCategoryNode {
  id: number;
  name: string;
  level: number;
  alias: string;
  display_order: number;
  children: JobCategoryNode[];
}

export interface JobCategorySearchResult {
  id: number;
  name: string;
  level: number;
  alias: string;
  path: string[];
  descendant_ids: number[];
}

export interface SeniorityLevel {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export async function getJobCategoryTree() {
  const { data } = await apiClient.get<JobCategoryNode[]>(
    "/job-categories/tree",
  );
  return data;
}

export async function searchJobCategories(query: string) {
  const { data } = await apiClient.get<JobCategorySearchResult[]>(
    "/job-categories/search",
    {
      params: { q: query },
    },
  );
  return data;
}

export async function getSeniorityLevels() {
  const { data } = await apiClient.get<SeniorityLevel[]>("/seniority-levels");
  return data;
}
