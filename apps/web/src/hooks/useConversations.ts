"use client";
import { useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import useSWR from "swr";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const fetcher = (url: string) => api.get(url);

export function useConversations(filters?: { status?: string; channel?: string }) {
  const params = new URLSearchParams();
  if (filters?.status)  params.set("status",  filters.status);
  if (filters?.channel) params.set("channel", filters.channel);

  const swr = useSWR(`/v1/conversations?${params}`, fetcher, {
    refreshInterval: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    const handler = () => swr.mutate();
    socket.on("inbox_update", handler);
    return () => { socket.off("inbox_update", handler); };
  }, [swr.mutate]);

  return swr;
}

export function useMessages(conversationId: string | null) {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!conversationId) return null;
    if (previousPageData && !previousPageData.hasMore) return null;
    const cursor = previousPageData?.data?.[0]?.createdAt;
    return `/v1/conversations/${conversationId}/messages?limit=50${cursor ? `&before=${cursor}` : ""}`;
  };

  return useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false });
}

export function useConversation(id: string | null) {
  return useSWR(id ? `/v1/conversations/${id}` : null, fetcher);
}
