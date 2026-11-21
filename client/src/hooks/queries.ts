import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Project, Testimonial, WebsiteSettings } from "@/types";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api.get<WebsiteSettings>("/settings"), staleTime: 5 * 60_000 });
}

export function usePublicProjects(params: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ["public-projects", params],
    queryFn: () => api.page<Project[]>("/projects", { limit: 60, ...params }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useTestimonials() {
  return useQuery({ queryKey: ["testimonials"], queryFn: () => api.get<Testimonial[]>("/testimonials"), staleTime: 5 * 60_000 });
}

/** Admin project list used by selects across the dashboard. */
export function useProjectOptions() {
  return useQuery({
    queryKey: ["project-options"],
    queryFn: () => api.get<Project[]>("/projects/admin", { limit: 60 }),
    staleTime: 60_000,
  });
}
