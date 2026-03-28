"use client";
import { useInboxStore }    from "@/stores/inbox.store";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel }        from "@/components/inbox/ChatPanel";
import { CRMPanel }         from "@/components/crm/CRMPanel";
import useSWR               from "swr";
import { api }              from "@/lib/api";

export default function InboxPage() {
  const { activeId } = useInboxStore();

  const { data: conv } = useSWR(
    activeId ? `/v1/conversations/${activeId}` : null,
    (url: string) => api.get<any>(url),
  );

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Conversation list — 280px */}
      <div style={{ width: 280, flexShrink: 0, overflow: "hidden" }}>
        <ConversationList />
      </div>

      {/* Chat panel — flex */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeId ? (
          <ChatPanel conversationId={activeId} />
        ) : (
          <div style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            height:         "100%",
            color:          "#9CA3AF",
            gap:            8,
          }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ fontSize: 14 }}>Chọn một hội thoại để bắt đầu</p>
          </div>
        )}
      </div>

      {/* CRM panel — 300px */}
      {conv?.contactId && (
        <div style={{ width: 300, flexShrink: 0, overflow: "hidden" }}>
          <CRMPanel contactId={conv.contactId} />
        </div>
      )}
    </div>
  );
}
