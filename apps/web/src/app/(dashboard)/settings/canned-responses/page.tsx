"use client";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

interface CannedResponse {
  id:        string;
  shortcut:  string;
  title:     string;
  body:      string;
  channel:   string | null;
  createdAt: string;
}

const fetcher = (url: string) => api.get<{ data: CannedResponse[] }>(url);

const EMPTY_FORM = { shortcut: "", title: "", body: "", channel: "all" };

export default function CannedResponsesPage() {
  const { data, mutate } = useSWR("/v1/canned-responses", fetcher);
  const rows = data?.data ?? [];

  const [search,   setSearch]   = useState("");
  const [editing,  setEditing]  = useState<CannedResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = rows.filter((r) =>
    !search ||
    r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.body.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (r: CannedResponse) => {
    setForm({ shortcut: r.shortcut, title: r.title, body: r.body, channel: r.channel ?? "all" });
    setEditing(r);
    setCreating(false);
  };

  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.shortcut.trim() || !form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/v1/canned-responses/${editing.id}`, {
          shortcut: form.shortcut.trim(),
          title:    form.title.trim(),
          body:     form.body.trim(),
        });
      } else {
        await api.post("/v1/canned-responses", {
          shortcut: form.shortcut.trim(),
          title:    form.title.trim(),
          body:     form.body.trim(),
          channel:  form.channel || "all",
        });
      }
      await mutate();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/v1/canned-responses/${id}`);
      await mutate();
    } finally {
      setDeleting(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    padding:      "8px 10px",
    background:   "#0F172A",
    border:       "1px solid #334155",
    borderRadius: 8,
    color:        "#F1F5F9",
    fontSize:     14,
    outline:      "none",
    boxSizing:    "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color:    "#94A3B8",
    marginBottom: 4,
    display:  "block",
  };

  return (
    <div style={{ padding: 32, maxWidth: 860, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#F1F5F9" }}>Câu trả lời mẫu</h1>
        <button
          onClick={openCreate}
          style={{
            padding:      "8px 16px",
            background:   "#3B82F6",
            color:        "#fff",
            border:       "none",
            borderRadius: 8,
            fontSize:     14,
            fontWeight:   500,
            cursor:       "pointer",
          }}
        >
          + Thêm mới
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm kiếm phím tắt, tiêu đề hoặc nội dung..."
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      {/* Form modal */}
      {(creating || editing) && (
        <div style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(0,0,0,0.6)",
          zIndex:     50,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background:   "#1E293B",
            borderRadius: 12,
            padding:      28,
            width:        520,
            boxShadow:    "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#F1F5F9" }}>
              {editing ? "Chỉnh sửa câu trả lời mẫu" : "Thêm câu trả lời mẫu"}
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Phím tắt <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                value={form.shortcut}
                onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                placeholder="vd: chao, datlich, gioitre"
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                Gõ /<em>{form.shortcut || "phím_tắt"}</em> trong chat để dùng
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Tiêu đề <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="vd: Lời chào, Đặt lịch, Giờ làm việc"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nội dung <span style={{ color: "#EF4444" }}>*</span></label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Nhập nội dung câu trả lời..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {!editing && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Kênh áp dụng</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="all">Tất cả kênh</option>
                  <option value="facebook">Facebook</option>
                  <option value="zalo">Zalo</option>
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={closeForm}
                style={{
                  padding:      "8px 16px",
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
                onClick={handleSave}
                disabled={saving || !form.shortcut.trim() || !form.title.trim() || !form.body.trim()}
                style={{
                  padding:      "8px 20px",
                  background:   saving ? "#475569" : "#3B82F6",
                  border:       "none",
                  borderRadius: 8,
                  color:        "#fff",
                  fontSize:     14,
                  fontWeight:   500,
                  cursor:       saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          padding:      40,
          textAlign:    "center",
          background:   "#1E293B",
          borderRadius: 12,
          color:        "#64748B",
          fontSize:     14,
        }}>
          {search ? "Không tìm thấy kết quả" : "Chưa có câu trả lời mẫu nào. Bấm \"+ Thêm mới\" để bắt đầu."}
        </div>
      ) : (
        <div style={{ background: "#1E293B", borderRadius: 12, overflow: "hidden", border: "1px solid #334155" }}>
          {/* Header */}
          <div style={{
            display:         "grid",
            gridTemplateColumns: "140px 1fr 80px 90px",
            padding:         "10px 16px",
            borderBottom:    "1px solid #334155",
            fontSize:        12,
            color:           "#64748B",
            fontWeight:      600,
          }}>
            <span>Phím tắt</span>
            <span>Tiêu đề / Nội dung</span>
            <span>Kênh</span>
            <span />
          </div>

          {filtered.map((r, i) => (
            <div
              key={r.id}
              style={{
                display:         "grid",
                gridTemplateColumns: "140px 1fr 80px 90px",
                padding:         "12px 16px",
                alignItems:      "center",
                borderBottom:    i < filtered.length - 1 ? "1px solid #1E293B" : "none",
                background:      i % 2 === 0 ? "#1E293B" : "#162032",
                gap:             8,
              }}
            >
              <span style={{
                fontFamily:   "monospace",
                fontSize:     13,
                color:        "#60A5FA",
                fontWeight:   600,
              }}>
                /{r.shortcut}
              </span>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#F1F5F9", fontWeight: 500, marginBottom: 2 }}>
                  {r.title}
                </div>
                <div style={{
                  fontSize:     12,
                  color:        "#94A3B8",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {r.body}
                </div>
              </div>

              <span style={{
                fontSize:     11,
                padding:      "2px 8px",
                borderRadius: 20,
                background:   "#0F172A",
                color:        "#94A3B8",
                whiteSpace:   "nowrap",
              }}>
                {r.channel === "all" || !r.channel ? "Tất cả" : r.channel}
              </span>

              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  onClick={() => openEdit(r)}
                  style={{
                    padding:      "4px 10px",
                    background:   "transparent",
                    border:       "1px solid #334155",
                    borderRadius: 6,
                    color:        "#94A3B8",
                    fontSize:     12,
                    cursor:       "pointer",
                  }}
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  style={{
                    padding:      "4px 10px",
                    background:   "transparent",
                    border:       "1px solid #334155",
                    borderRadius: 6,
                    color:        "#EF4444",
                    fontSize:     12,
                    cursor:       deleting === r.id ? "not-allowed" : "pointer",
                  }}
                >
                  {deleting === r.id ? "..." : "Xóa"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
