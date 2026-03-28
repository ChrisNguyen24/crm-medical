"use client";
import { create } from "zustand";

interface ConversationSummary {
  id: string;
  channel: string;
  status: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  assignedAgent?: string;
  contact: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    phone?: string;
  };
  unreadCount?: number;
}

interface InboxState {
  conversations:      ConversationSummary[];
  activeId:           string | null;
  setConversations:   (list: ConversationSummary[]) => void;
  setActive:          (id: string | null) => void;
  upsertConversation: (conv: ConversationSummary) => void;
  bumpToTop:          (conversationId: string, text?: string) => void;
  incrementUnread:    (conversationId: string) => void;
  clearUnread:        (conversationId: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  conversations: [],
  activeId:      null,

  setConversations: (list) => set({ conversations: list }),

  setActive: (id) => set({ activeId: id }),

  upsertConversation: (conv) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        const updated = [...state.conversations];
        updated[idx] = { ...updated[idx], ...conv };
        return { conversations: updated };
      }
      return { conversations: [conv, ...state.conversations] };
    }),

  bumpToTop: (conversationId, text) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conversationId);
      if (idx < 0) return state;
      const conv = {
        ...state.conversations[idx],
        lastMessageAt:   new Date().toISOString(),
        lastMessageText: text ?? state.conversations[idx].lastMessageText,
      };
      const rest = state.conversations.filter((c) => c.id !== conversationId);
      return { conversations: [conv, ...rest] };
    }),

  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
          : c,
      ),
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    })),
}));
