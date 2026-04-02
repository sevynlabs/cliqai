"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLeads, searchLeads, updateLeadStage, type Lead } from "../lib/api";

export function useLeads(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => fetchLeads(filters),
    staleTime: 30_000,
  });
}

export function useSearchLeads(query: string) {
  return useQuery({
    queryKey: ["leads", "search", query],
    queryFn: () => searchLeads(query),
    enabled: query.length >= 2,
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      updateLeadStage(leadId, stage),
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData<Lead[]>(["leads"]);
      queryClient.setQueriesData<Lead[]>(
        { queryKey: ["leads"] },
        (old) =>
          old?.map((l) => (l.id === leadId ? { ...l, stage } : l)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["leads"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
