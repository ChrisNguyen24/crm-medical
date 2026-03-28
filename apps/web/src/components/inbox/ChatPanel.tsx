"use client";
import { useEffect, useRef } from "react";
import { useMessages }         from "@/hooks/useConversations";
import { useJoinConversation } from "@/hooks/useSocket";
import { getSocket }           from "@/lib/socket";
import { useInboxStore }       from "@/stores/inbox.store";
import { useAuthStore }        from "@/stores/auth.store";
import { api }                 from "@/lib/api";
import { Avatar }              from "@/components/shared/Avatar";
import { MessageBubble }       from "./MessageBubble";
import { MessageComposer }     from "./MessageComposer";

interface Props {
  conversationId: string;
}

export function ChatPanel({ conversationId }: Props) {
  const { data: pages, size, setSize, mutate } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { conversations, setStar, setUnreadByAgent, setActive, setStatus, removeConversation } = useInboxStore();
  const currentUser = useAuthStore((s) => s.user);
  const conv = conversations.find((c) => c.id === conversationId);

  useJoinConversation(conversationId);

  const messages = pages?.flatMap((p: any) => p.data ?? []) ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) mutate();
    };
    socket.on("new_message", handler);
    return () => { socket.off("new_message", handler); };
  }, [conversationId, mutate]);

  const handleSent = () => { mutate(); };

  const handleStar = async () => {
    if (!conv) return;
    const next = !conv.isStarred;
    setStar(conversationId, next);
    await api.patch(`/v1/conversations/${conversationId}`, { is_starred: next });
  };

  const handleMarkUnread = async () => {
    setUnreadByAgent(conversationId, true);
    await api.patch(`/v1/conversations/${conversationId}`, { is_unread_by_agent: true });
    setActive(null);
  };

  const handleResolve = async () => {
    setStatus(conversationId, "resolved");
    setActive(null);
    await api.patch(`/v1/conversations/${conversationId}`, { status: "resolved" });
  };

  const handleDelete = async () => {
    removeConversation(conversationId);
    setActive(null);
    await api.delete(`/v1/conversations/${conversationId}`);
  };

  const handleFlag = async () => {
    await api.patch(`/v1/conversations/${conversationId}`, { is_flagged: true });
  };

  const iconBtn = (onClick: () => void, title: string, content: React.ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width:        36,
        height:       36,
        border:       "1px solid #E5E7EB",
        borderRadius: 8,
        background:   "#fff",
        cursor:       "pointer",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        fontSize:     16,
        color:        "#6B7280",
        flexShrink:   0,
      }}
    >
      {content}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FAFAFA" }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "8px 14px",
        borderBottom:   "1px solid #E5E7EB",
        background:     "#fff",
        gap:            12,
      }}>
        {/* Left: contact info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Avatar
            name={conv?.contact.displayName ?? "?"}
            url={conv?.contact.avatarUrl}
            size={38}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {conv?.contact.displayName ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              Chỉ định cuộc trò chuyện này
              <span style={{ fontSize: 10 }}>▾</span>
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {iconBtn(handleFlag, "Gắn cờ", "⚠")}
          {iconBtn(handleDelete, "Xóa hội thoại", "🗑")}
          {iconBtn(
            handleStar,
            conv?.isStarred ? "Bỏ đánh dấu sao" : "Đánh dấu sao",
            <span style={{ color: conv?.isStarred ? "#F59E0B" : "#6B7280" }}>
              {conv?.isStarred ? "★" : "☆"}
            </span>,
          )}
          {iconBtn(handleMarkUnread, "Đánh dấu chưa đọc", "✉")}
          {iconBtn(
            handleResolve,
            "Giải quyết",
            <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span>,
          )}
        </div>
      </div>

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
          <MessageBubble
            key={msg.id}
            msg={msg}
            contactAvatarUrl={conv?.contact.avatarUrl}
            contactName={conv?.contact.displayName}
            agentAvatarUrl={currentUser?.avatarUrl}
            agentName={currentUser?.name}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer conversationId={conversationId} onSent={handleSent} />
    </div>
  );
}
