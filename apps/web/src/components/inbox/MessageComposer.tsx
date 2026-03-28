"use client";
import { useState, useRef, useEffect, type KeyboardEvent } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch canned responses when "/" is typed
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

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.post(`/v1/conversations/${conversationId}/messages`, { text: trimmed });
      setText("");
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #E5E7EB", padding: "10px 14px", position: "relative" }}>
      {/* Canned responses picker */}
      {showCanned && canned.length > 0 && (
        <div style={{
          position:   "absolute",
          bottom:     "100%",
          left:       14,
          right:      14,
          background: "#fff",
          border:     "1px solid #E5E7EB",
          borderRadius: 8,
          boxShadow:  "0 4px 12px rgba(0,0,0,0.1)",
          maxHeight:  200,
          overflowY:  "auto",
          zIndex:     10,
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

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Nhập tin nhắn... (gõ "/" để dùng câu trả lời mẫu)'
          rows={2}
          style={{
            flex:       1,
            resize:     "none",
            border:     "1px solid #E5E7EB",
            borderRadius: 8,
            padding:    "8px 10px",
            fontSize:   13,
            outline:    "none",
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            padding:      "8px 16px",
            background:   text.trim() ? "#3B82F6" : "#E5E7EB",
            color:        text.trim() ? "#fff" : "#9CA3AF",
            border:       "none",
            borderRadius: 8,
            cursor:       text.trim() ? "pointer" : "default",
            fontSize:     13,
            fontWeight:   600,
            flexShrink:   0,
          }}
        >
          {sending ? "..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}
