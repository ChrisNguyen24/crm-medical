"use client";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar }       from "@/components/shared/Avatar";
import { ChannelBadge } from "@/components/shared/ChannelBadge";

interface Props {
  id:              string;
  channel:         string;
  status:          string;
  lastMessageText?: string;
  lastMessageAt?:  string;
  unreadCount?:    number;
  isStarred?:      boolean;
  isUnreadByAgent?: boolean;
  contact: {
    displayName: string;
    avatarUrl?:  string | null;
  };
  isActive:   boolean;
  onClick:    () => void;
  onStar?:    (e: React.MouseEvent) => void;
  onMarkUnread?: (e: React.MouseEvent) => void;
}

export function ConversationItem({
  channel, status, lastMessageText, lastMessageAt,
  unreadCount, isStarred, isUnreadByAgent,
  contact, isActive, onClick, onStar, onMarkUnread,
}: Props) {
  const timeAgo = lastMessageAt
    ? formatDistanceToNowStrict(new Date(lastMessageAt), { addSuffix: false })
    : "";

  const hasUnread = (unreadCount ?? 0) > 0 || isUnreadByAgent;

  return (
    <button
      onClick={onClick}
      style={{
        display:    "flex",
        gap:        10,
        padding:    "10px 14px",
        background: isActive ? "#EFF6FF" : "transparent",
        border:     "none",
        borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
        width:      "100%",
        textAlign:  "left",
        cursor:     "pointer",
        transition: "background 0.1s",
        position:   "relative",
      }}
    >
      <Avatar name={contact.displayName} url={contact.avatarUrl} size={38} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <ChannelBadge channel={channel} />
          <span style={{
            fontWeight:    hasUnread ? 700 : 600,
            fontSize:      13,
            flex:          1,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
            color:         hasUnread ? "#111827" : undefined,
          }}>
            {contact.displayName}
          </span>
          <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{timeAgo}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize:      12,
            color:         hasUnread ? "#374151" : "#6B7280",
            fontWeight:    hasUnread ? 600 : 400,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
            flex:          1,
          }}>
            {lastMessageText ?? "No messages yet"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
            {(unreadCount ?? 0) > 0 && (
              <span style={{
                background:     "#EF4444",
                color:          "#fff",
                borderRadius:   "50%",
                fontSize:       10,
                fontWeight:     700,
                minWidth:       18,
                height:         18,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                padding:        "0 4px",
              }}>
                {unreadCount}
              </span>
            )}
            {isUnreadByAgent && (unreadCount ?? 0) === 0 && (
              <span style={{
                width:        8,
                height:       8,
                borderRadius: "50%",
                background:   "#3B82F6",
                flexShrink:   0,
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Star button */}
      {onStar && (
        <button
          onClick={(e) => { e.stopPropagation(); onStar(e); }}
          title={isStarred ? "Bỏ đánh dấu" : "Đánh dấu sao"}
          style={{
            border:       "none",
            background:   "transparent",
            cursor:       "pointer",
            fontSize:     16,
            padding:      "0 2px",
            color:        isStarred ? "#F59E0B" : "#D1D5DB",
            lineHeight:   1,
            flexShrink:   0,
            alignSelf:    "center",
          }}
        >
          {isStarred ? "★" : "☆"}
        </button>
      )}
    </button>
  );
}
