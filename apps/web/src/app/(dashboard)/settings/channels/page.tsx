"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface ChannelConfig {
  id: string;
  channel: string;
  externalAccountId: string;
  label: string;
  isActive: string;
  tokenExpiresAt: string | null;
  createdAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:  "Bạn đã từ chối kết nối Facebook.",
  invalid_state:  "Phiên xác thực hết hạn. Vui lòng thử lại.",
  token_exchange: "Không thể lấy token từ Facebook. Kiểm tra App ID / Secret.",
  pages_fetch:    "Không thể lấy danh sách trang từ Facebook.",
  no_pages:       "Tài khoản này không quản lý trang Facebook nào.",
};

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");

  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading]   = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api.get<{ data: ChannelConfig[] }>("/v1/channels")
      .then((res) => setChannels(res.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnectFacebook() {
    setConnecting(true);
    try {
      const { url } = await api.get<{ url: string }>("/v1/facebook/oauth/url");
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function handleDisconnect(id: string) {
    await api.delete(`/v1/channels/${id}`);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ padding: 32, maxWidth: 720, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#F1F5F9" }}>Kênh kết nối</h1>
        <button
          onClick={handleConnectFacebook}
          disabled={connecting}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            padding:      "8px 16px",
            background:   connecting ? "#475569" : "#1877F2",
            color:        "#fff",
            border:       "none",
            borderRadius: 8,
            fontSize:     14,
            fontWeight:   500,
            cursor:       connecting ? "not-allowed" : "pointer",
          }}
        >
          {connecting ? "Đang chuyển hướng..." : "Kết nối Facebook Page"}
        </button>
      </div>

      {errorKey && (
        <div style={{
          marginBottom: 16,
          padding:      "12px 16px",
          background:   "#450A0A",
          border:       "1px solid #7F1D1D",
          borderRadius: 8,
          color:        "#FCA5A5",
          fontSize:     14,
        }}>
          {ERROR_MESSAGES[errorKey] ?? "Đã xảy ra lỗi. Vui lòng thử lại."}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94A3B8", fontSize: 14 }}>Đang tải...</p>
      ) : channels.length === 0 ? (
        <div style={{
          padding:      32,
          textAlign:    "center",
          background:   "#1E293B",
          borderRadius: 12,
          color:        "#64748B",
          fontSize:     14,
        }}>
          Chưa có kênh nào được kết nối.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {channels.map((ch) => (
            <div
              key={ch.id}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:        "14px 16px",
                background:     "#1E293B",
                borderRadius:   10,
                border:         "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>
                  {ch.channel === "facebook"  ? "📘"
                  : ch.channel === "instagram" ? "📸"
                  : ch.channel === "zalo"      ? "💬"
                  : "📡"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#F1F5F9" }}>{ch.label}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    {ch.channel} · ID {ch.externalAccountId}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  fontSize:     12,
                  padding:      "3px 8px",
                  borderRadius: 20,
                  background:   ch.isActive === "true" ? "#052E16" : "#1C1917",
                  color:        ch.isActive === "true" ? "#86EFAC" : "#78716C",
                }}>
                  {ch.isActive === "true" ? "Đang hoạt động" : "Tắt"}
                </span>
                <button
                  onClick={() => handleDisconnect(ch.id)}
                  style={{
                    padding:      "5px 10px",
                    background:   "transparent",
                    border:       "1px solid #475569",
                    borderRadius: 6,
                    color:        "#94A3B8",
                    fontSize:     12,
                    cursor:       "pointer",
                  }}
                >
                  Ngắt kết nối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
