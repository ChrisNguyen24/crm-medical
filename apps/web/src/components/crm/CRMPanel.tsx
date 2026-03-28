"use client";
import { useState } from "react";
import useSWR       from "swr";
import { api }      from "@/lib/api";
import { Avatar }   from "@/components/shared/Avatar";
import { format }   from "date-fns";

interface Props { contactId: string }

const fetcher = (url: string) => api.get(url);

const ACTIVITY_ICONS: Record<string, string> = {
  message:               "💬",
  note:                  "📝",
  call:                  "📞",
  deal_created:          "🤝",
  deal_stage_changed:    "➡️",
  contact_created:       "👤",
  contact_updated:       "✏️",
  conversation_assigned: "🔀",
  conversation_resolved: "✅",
};

export function CRMPanel({ contactId }: Props) {
  const [tab, setTab] = useState<"contact" | "deal" | "activity">("contact");

  const { data: contact } = useSWR<Record<string, any>>(`/v1/contacts/${contactId}`, fetcher as any);
  const { data: deals }   = useSWR<{ data: any[] }>(`/v1/pipeline/deals?contact_id=${contactId}`, fetcher as any);
  const { data: acts }    = useSWR<{ data: any[] }>(`/v1/contacts/${contactId}/activities`, fetcher as any);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "1px solid #E5E7EB" }}>
      {/* Contact header */}
      {contact && (
        <div style={{ padding: "16px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar name={(contact as any).displayName} url={(contact as any).avatarUrl} size={42} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{(contact as any).displayName}</div>
            {(contact as any).phone && <div style={{ fontSize: 12, color: "#6B7280" }}>{(contact as any).phone}</div>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
        {(["contact", "deal", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex:       1,
              padding:    "8px 4px",
              fontSize:   12,
              border:     "none",
              borderBottom: tab === t ? "2px solid #3B82F6" : "2px solid transparent",
              background: "transparent",
              cursor:     "pointer",
              color:      tab === t ? "#3B82F6" : "#6B7280",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === "contact" ? "Thông tin" : t === "deal" ? "Deal" : "Lịch sử"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {/* Contact tab */}
        {tab === "contact" && contact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              ["Email",    contact.email],
              ["SĐT",      contact.phone],
              ["Giới tính", contact.gender === "male" ? "Nam" : contact.gender === "female" ? "Nữ" : contact.gender],
              ["Ngôn ngữ", contact.locale ? contact.locale.replace("_", " / ") : undefined],
              ["Ghi chú",  contact.notes],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13 }}>{value}</div>
              </div>
            ))}

            {((contact as any).tags ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(contact as any).tags.map((tag: string) => (
                    <span key={tag} style={{
                      padding:      "2px 8px",
                      background:   "#EFF6FF",
                      color:        "#3B82F6",
                      borderRadius: 10,
                      fontSize:     11,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deal tab */}
        {tab === "deal" && (
          <div>
            {((deals as any)?.data ?? []).length === 0 && (
              <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 20 }}>Chưa có deal</p>
            )}
            {((deals as any)?.data ?? []).map((deal: any) => (
              <div key={deal.id} style={{
                border:       "1px solid #E5E7EB",
                borderRadius: 8,
                padding:      "10px 12px",
                marginBottom: 8,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{deal.title}</div>
                {deal.value && (
                  <div style={{ fontSize: 12, color: "#10B981", marginTop: 2 }}>
                    {Number(deal.value).toLocaleString("vi-VN")} {deal.currency}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  {format(new Date(deal.createdAt), "dd/MM/yyyy")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity tab */}
        {tab === "activity" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {((acts as any)?.data ?? []).map((act: any) => (
              <div key={act.id} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {ACTIVITY_ICONS[act.type] ?? "•"}
                </span>
                <div>
                  <div style={{ color: "#374151" }}>{act.summary}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 11 }}>
                    {format(new Date(act.createdAt), "dd/MM HH:mm")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
