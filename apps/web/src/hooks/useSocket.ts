"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useInboxStore } from "@/stores/inbox.store";

export function useSocketEvents() {
  const { bumpToTop, incrementUnread, activeId } = useInboxStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_message", (data: {
      conversationId: string;
      text?: string;
      platform: string;
    }) => {
      bumpToTop(data.conversationId, data.text);
      // Only increment unread if this is not the active conversation
      if (data.conversationId !== activeId) {
        incrementUnread(data.conversationId);
      }
    });

    socket.on("conversation_assigned", (data: { conversationId: string }) => {
      // Refresh that conversation in the list (handled by bumpToTop)
      bumpToTop(data.conversationId);
    });

    return () => {
      socket.off("new_message");
      socket.off("conversation_assigned");
    };
  }, [activeId, bumpToTop, incrementUnread]);
}

export function useJoinConversation(conversationId: string | null) {
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit("join_conversation", { conversationId });
    return () => { socket.emit("leave_conversation", { conversationId }); };
  }, [conversationId]);
}
