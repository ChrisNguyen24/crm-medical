"use client";
import { useEffect, useRef } from "react";
import { mutate }           from "swr";
import { useMessages }      from "@/hooks/useConversations";
import { useJoinConversation } from "@/hooks/useSocket";
import { MessageBubble }    from "./MessageBubble";
import { MessageComposer }  from "./MessageComposer";

interface Props {
  conversationId: string;
}

export function ChatPanel({ conversationId }: Props) {
  const { data: pages, size, setSize } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useJoinConversation(conversationId);

  const messages = pages?.flatMap((p: any) => p.data ?? []) ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSent = () => {
    mutate(`/v1/conversations/${conversationId}/messages?limit=50`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FAFAFA" }}>
      {/* Load more */}
      {(pages?.[pages.length - 1] as any)?.hasMore !== false && (
        <button
          onClick={() => setSize(size + 1)}
          style={{
            margin:       "8px auto",
            padding:      "4px 14px",
            fontSize:     12,
            background:   "transparent",
            border:       "1px solid #E5E7EB",
            borderRadius: 12,
            cursor:       "pointer",
            color:        "#6B7280",
          }}
        >
          Tải thêm tin cũ hơn
        </button>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 40 }}>
            Chưa có tin nhắn nào
          </p>
        )}
        {messages.map((msg: any) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer conversationId={conversationId} onSent={handleSent} />
    </div>
  );
}
