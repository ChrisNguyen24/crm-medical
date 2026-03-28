"use client";
import { useState, useEffect } from "react";
import { useInboxStore }       from "@/stores/inbox.store";
import { useConversations }    from "@/hooks/useConversations";
import { ConversationItem }    from "./ConversationItem";
import { api }                 from "@/lib/api";

const STATUS_TABS = [
  { value: "open",     label: "Đang mở" },
  { value: "pending",  label: "Chờ xử lý" },
  { value: "resolved", label: "Đã xong" },
];

const CHANNEL_FILTERS = [
  { value: "",          label: "Tất cả" },
  { value: "facebook",  label: "Facebook" },
  { value: "zalo",      label: "Zalo" },
];

export function ConversationList() {
  const [status,      setStatus]      = useState("open");
  const [channel,     setChannel]     = useState("");
  const [starredOnly, setStarredOnly] = useState(false);

  const { activeId, setActive, setConversations, clearUnread, conversations, setStar, setUnreadByAgent } = useInboxStore();

  const { data } = useConversations({ status, channel: channel || undefined });

  useEffect(() => {
    if (data) setConversations((data as any).data ?? []);
  }, [data, setConversations]);

  const handleClick = (id: string) => {
    setActive(id);
    clearUnread(id);
    // Clear server-side unread flag when opening
    api.patch(`/v1/conversations/${id}`, { is_unread_by_agent: false }).catch(() => {});
  };

  const handleStar = async (id: string, current: boolean) => {
    const next = !current;
    setStar(id, next);
    await api.patch(`/v1/conversations/${id}`, { is_starred: next });
  };

  const displayed = starredOnly
    ? conversations.filter((c) => c.isStarred)
    : conversations;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid #E5E7EB" }}>
      {/* Header */}
      <div style={{ padding: "14px 14px 0", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Hộp thư</h2>
          <button
            onClick={() => setStarredOnly((v) => !v)}
            title="Lọc tin nhắn đã đánh dấu sao"
            style={{
              border:       "none",
              background:   "transparent",
              cursor:       "pointer",
              fontSize:     16,
              color:        starredOnly ? "#F59E0B" : "#D1D5DB",
              padding:      "2px 4px",
            }}
          >
            ★
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              style={{
                padding:      "4px 10px",
                fontSize:     12,
                border:       "none",
                borderRadius: 6,
                cursor:       "pointer",
                background:   status === t.value ? "#3B82F6" : "transparent",
                color:        status === t.value ? "#fff" : "#6B7280",
                fontWeight:   status === t.value ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Channel filter */}
        <div style={{ display: "flex", gap: 4, paddingBottom: 10 }}>
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setChannel(f.value)}
              style={{
                padding:      "3px 8px",
                fontSize:     11,
                border:       `1px solid ${channel === f.value ? "#3B82F6" : "#E5E7EB"}`,
                borderRadius: 12,
                cursor:       "pointer",
                background:   channel === f.value ? "#EFF6FF" : "#fff",
                color:        channel === f.value ? "#3B82F6" : "#6B7280",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {displayed.length === 0 && (
          <p style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {starredOnly ? "Chưa có tin nhắn đánh dấu sao" : "Không có hội thoại nào"}
          </p>
        )}
        {displayed.map((conv) => (
          <ConversationItem
            key={conv.id}
            {...conv}
            isActive={conv.id === activeId}
            onClick={() => handleClick(conv.id)}
            onStar={(e) => handleStar(conv.id, conv.isStarred ?? false)}
          />
        ))}
      </div>
    </div>
  );
}
