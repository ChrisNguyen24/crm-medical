"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

interface CannedResponse { id: string; shortcut: string; title: string; body: string }

interface Props {
  conversationId: string;
  onSent:         () => void;
}

export function MessageComposer({ conversationId, onSent }: Props) {
  const [text,        setText]       = useState("");
  const [sending,     setSending]    = useState(false);
  const [showCanned,  setShowCanned] = useState(false);
  const [cannedQuery, setCannedQuery]= useState("");
  const [file,        setFile]       = useState<File | null>(null);
  const [preview,     setPreview]    = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cannedData } = useSWR(
    showCanned ? `/v1/canned-responses?q=${cannedQuery}` : null,
    (url: string) => api.get<{ data: CannedResponse[] }>(url),
  );
  const canned = cannedData?.data ?? [];

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleChange = (v: string) => {
    setText(v);
    if (v.startsWith("/")) {
      setShowCanned(true);
      setCannedQuery(v.slice(1));
    } else {
      setShowCanned(false);
    }
  };

  const selectCanned = (c: CannedResponse) => {
    setText(c.body);
    setShowCanned(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
    e.target.value = "";
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    if (sending) return;
    setSending(true);
    try {
      if (file) {
        const form = new FormData();
        if (trimmed) form.append("text", trimmed);
        form.append("file", file);
        await api.postForm(`/v1/conversations/${conversationId}/messages`, form);
        clearFile();
      } else {
        await api.post(`/v1/conversations/${conversationId}/messages`, { text: trimmed });
      }
      setText("");
      onSent();
    } finally {
      setSending(false);
    }
  };

  const canSend = (text.trim().length > 0 || !!file) && !sending;

  return (
    <div style={{ borderTop: "1px solid #E5E7EB", padding: "10px 14px", position: "relative" }}>
      {/* Canned responses picker */}
      {showCanned && canned.length > 0 && (
        <div style={{
          position:     "absolute",
          bottom:       "100%",
          left:         14,
          right:        14,
          background:   "#fff",
          border:       "1px solid #E5E7EB",
          borderRadius: 8,
          boxShadow:    "0 4px 12px rgba(0,0,0,0.1)",
          maxHeight:    200,
          overflowY:    "auto",
          zIndex:       10,
        }}>
          {canned.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCanned(c)}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                padding:    "8px 12px",
                border:     "none",
                background: "transparent",
                cursor:     "pointer",
                fontSize:   13,
              }}
            >
              <span style={{ color: "#3B82F6", fontWeight: 600 }}>{c.shortcut}</span>
              {" "}— {c.title}
            </button>
          ))}
        </div>
      )}

      {/* File preview */}
      {file && (
        <div style={{
          marginBottom:  8,
          padding:       "8px 10px",
          background:    "#F9FAFB",
          border:        "1px solid #E5E7EB",
          borderRadius:  8,
          display:       "flex",
          alignItems:    "center",
          gap:           10,
        }}>
          {preview ? (
            <img src={preview} alt="" style={{ height: 56, borderRadius: 6, objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 24 }}>📎</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>
              {(file.size / 1024).toFixed(0)} KB
            </div>
          </div>
          <button
            onClick={clearFile}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "#9CA3AF", padding: 4 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        {/* Attach file button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm file / ảnh"
          style={{
            width:        36,
            height:       36,
            border:       "1px solid #E5E7EB",
            borderRadius: 8,
            background:   "#fff",
            cursor:       "pointer",
            fontSize:     18,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            flexShrink:   0,
            color:        "#6B7280",
          }}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={file ? "Thêm chú thích... (tùy chọn)" : 'Nhập tin nhắn... (gõ "/" để dùng câu trả lời mẫu)'}
          rows={2}
          style={{
            flex:         1,
            resize:       "none",
            border:       "1px solid #E5E7EB",
            borderRadius: 8,
            padding:      "8px 10px",
            fontSize:     13,
            outline:      "none",
            lineHeight:   1.5,
          }}
        />

        <button
          onClick={send}
          disabled={!canSend}
          style={{
            padding:        "8px 16px",
            background:     sending ? "#93C5FD" : canSend ? "#3B82F6" : "#E5E7EB",
            color:          canSend ? "#fff" : "#9CA3AF",
            border:         "none",
            borderRadius:   8,
            cursor:         canSend ? "pointer" : "default",
            fontSize:       13,
            fontWeight:     600,
            flexShrink:     0,
            display:        "flex",
            alignItems:     "center",
            gap:            6,
            minWidth:       64,
            justifyContent: "center",
          }}
        >
          {sending ? (
            <>
              <span style={{
                width:       14,
                height:      14,
                border:      "2px solid rgba(255,255,255,0.4)",
                borderTop:   "2px solid #fff",
                borderRadius:"50%",
                display:     "inline-block",
                animation:   "spin 0.7s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : "Gửi"}
        </button>
      </div>
    </div>
  );
}
