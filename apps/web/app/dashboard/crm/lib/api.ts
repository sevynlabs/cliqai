const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Lead {
  id: string;
  name: string | null;
  phone: string;
  procedureInterest: string | null;
  stage: string;
  score: number;
  source: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function fetchLeads(filters?: Record<string, string>): Promise<Lead[]> {
  const params = new URLSearchParams(filters ?? {});
  return apiFetch<Lead[]>(`/api/leads?${params}`);
}

export function searchLeads(query: string): Promise<Lead[]> {
  return apiFetch<Lead[]>(`/api/leads/search?q=${encodeURIComponent(query)}`);
}

export function updateLeadStage(
  leadId: string,
  stage: string,
): Promise<Lead> {
  return apiFetch<Lead>(`/api/leads/${leadId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

export function takeOverConversation(conversationId: string) {
  return apiFetch(`/api/handoff/${conversationId}/takeover`, { method: "POST" });
}

export function returnToAI(conversationId: string) {
  return apiFetch(`/api/handoff/${conversationId}/return`, { method: "POST" });
}
