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
  contact: {
    displayName: string;
    avatarUrl?:  string | null;
  };
  isActive: boolean;
  onClick:  () => void;
}

export function ConversationItem({
  channel, status, lastMessageText, lastMessageAt,
  unreadCount, contact, isActive, onClick,
}: Props) {
  const timeAgo = lastMessageAt
    ? formatDistanceToNowStrict(new Date(lastMessageAt), { addSuffix: false })
    : "";

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
      }}
    >
      <Avatar name={contact.displayName} url={contact.avatarUrl} size={38} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <ChannelBadge channel={channel} />
          <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contact.displayName}
          </span>
          <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{timeAgo}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 12, color: "#6B7280",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
          }}>
            {lastMessageText ?? "No messages yet"}
          </span>
          {(unreadCount ?? 0) > 0 && (
            <span style={{
              background:    "#EF4444",
              color:         "#fff",
              borderRadius:  "50%",
              fontSize:      10,
              fontWeight:    700,
              minWidth:      18,
              height:        18,
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              padding:       "0 4px",
              marginLeft:    6,
              flexShrink:    0,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
