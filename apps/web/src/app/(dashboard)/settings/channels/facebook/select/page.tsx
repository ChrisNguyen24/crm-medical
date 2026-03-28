"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface FbPageOption {
  id: string;
  name: string;
  category: string;
}

export default function FacebookSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session") ?? "";

  const [pages, setPages]       = useState<FbPageOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!session) { router.replace("/settings/channels?error=invalid_state"); return; }

    api.get<{ data: FbPageOption[] }>(`/v1/facebook/oauth/pages?session=${session}`)
      .then((res) => setPages(res.data))
      .catch(() => setError("Phiên đã hết hạn. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, [session, router]);

  async function handleConnect() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/v1/facebook/oauth/connect", { session, pageId: selected });
      router.push("/settings/channels");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kết nối thất bại. Vui lòng thử lại.");
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 560, width: "100%" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#F1F5F9" }}>
        Chọn trang Facebook
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "#94A3B8" }}>
        Chọn trang bạn muốn kết nối với hệ thống CRM.
      </p>

      {error && (
        <div style={{
          marginBottom: 16,
          padding:      "12px 16px",
          background:   "#450A0A",
          border:       "1px solid #7F1D1D",
          borderRadius: 8,
          color:        "#FCA5A5",
          fontSize:     14,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94A3B8", fontSize: 14 }}>Đang tải danh sách trang...</p>
      ) : pages.length === 0 ? (
        <p style={{ color: "#94A3B8", fontSize: 14 }}>Không tìm thấy trang nào.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {pages.map((page) => {
            const isSelected = selected === page.id;
            return (
              <button
                key={page.id}
                onClick={() => setSelected(page.id)}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  padding:     "14px 16px",
                  background:  isSelected ? "#1D3461" : "#1E293B",
                  border:      `1px solid ${isSelected ? "#3B82F6" : "#334155"}`,
                  borderRadius: 10,
                  textAlign:   "left",
                  cursor:      "pointer",
                  width:       "100%",
                }}
              >
                <div style={{
                  width:        36,
                  height:       36,
                  background:   "#1877F2",
                  borderRadius: "50%",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  color:        "#fff",
                  fontWeight:   700,
                  fontSize:     16,
                  flexShrink:   0,
                }}>
                  {page.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#F1F5F9" }}>{page.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{page.category}</div>
                </div>
                {isSelected && (
                  <span style={{ marginLeft: "auto", color: "#3B82F6", fontSize: 18 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => router.push("/settings/channels")}
          style={{
            padding:      "9px 18px",
            background:   "transparent",
            border:       "1px solid #475569",
            borderRadius: 8,
            color:        "#94A3B8",
            fontSize:     14,
            cursor:       "pointer",
          }}
        >
          Hủy
        </button>
        <button
          onClick={handleConnect}
          disabled={!selected || saving}
          style={{
            padding:      "9px 18px",
            background:   !selected || saving ? "#475569" : "#1877F2",
            border:       "none",
            borderRadius: 8,
            color:        "#fff",
            fontSize:     14,
            fontWeight:   500,
            cursor:       !selected || saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Đang kết nối..." : "Kết nối trang"}
        </button>
      </div>
    </div>
  );
}
