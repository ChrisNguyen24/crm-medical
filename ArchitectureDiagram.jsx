import { useState } from "react";

const layers = [
  {
    id: "channels",
    label: "Kênh đầu vào",
    color: "#378ADD",
    lightBg: "#E6F1FB",
    lightText: "#0C447C",
    nodes: [
      { name: "Facebook Messenger", sub: "Graph API + Webhook" },
      { name: "Zalo OA", sub: "Zalo OA API + Webhook" },
      { name: "TikTok", sub: "TikTok Comment API" },
      { name: "Instagram DM", sub: "Meta Graph API" },
    ],
  },
  {
    id: "gateway",
    label: "Webhook Gateway",
    color: "#D85A30",
    lightBg: "#FAECE7",
    lightText: "#712B13",
    nodes: [
      { name: "Event receiver", sub: "Nhận webhook từ mọi platform" },
      { name: "Signature verify", sub: "Xác thực HMAC / token" },
      { name: "Normalizer", sub: "Chuẩn hóa về MessageEvent chung" },
      { name: "Queue publisher", sub: "Đẩy vào message queue" },
    ],
  },
  {
    id: "core",
    label: "Core Services",
    color: "#534AB7",
    lightBg: "#EEEDFE",
    lightText: "#3C3489",
    nodes: [
      { name: "Conversation Service", sub: "Tạo / merge / assign hội thoại" },
      { name: "Contact Service", sub: "Deduplicate, upsert contact" },
      { name: "CRM Sync Service", sub: "Tạo deal, update pipeline" },
      { name: "Notification Service", sub: "Push realtime tới agent" },
    ],
  },
  {
    id: "crm",
    label: "Custom CRM",
    color: "#0F6E56",
    lightBg: "#E1F5EE",
    lightText: "#085041",
    nodes: [
      { name: "Contact DB", sub: "Postgres — profile, lịch sử" },
      { name: "Deal Pipeline", sub: "Stage, owner, value, notes" },
      { name: "Activity Log", sub: "Mọi tương tác theo timeline" },
      { name: "Report Engine", sub: "Conversion, response time" },
    ],
  },
  {
    id: "ui",
    label: "Agent UI",
    color: "#854F0B",
    lightBg: "#FAEEDA",
    lightText: "#633806",
    nodes: [
      { name: "Unified Inbox", sub: "Tất cả kênh trong 1 giao diện" },
      { name: "CRM Panel", sub: "Contact + deal cạnh chat" },
      { name: "Canned Responses", sub: "Phím tắt câu trả lời mẫu" },
      { name: "Manager Dashboard", sub: "KPI, assign, monitor" },
    ],
  },
];

const techStack = [
  { layer: "API Gateway", tech: "Node.js + Express / Fastify", note: "Xử lý webhook volume cao" },
  { layer: "Message Queue", tech: "Redis Streams hoặc RabbitMQ", note: "Đảm bảo không mất tin nhắn" },
  { layer: "Core Services", tech: "Node.js hoặc Go", note: "Go nếu cần throughput cao" },
  { layer: "Database", tech: "PostgreSQL + Redis cache", note: "Postgres cho data, Redis cho realtime" },
  { layer: "Realtime (agent)", tech: "WebSocket (Socket.io)", note: "Tin nhắn mới hiện ngay không cần refresh" },
  { layer: "Frontend", tech: "Next.js + React", note: "SSR cho dashboard, SPA cho inbox" },
  { layer: "File storage", tech: "S3 / Cloudflare R2", note: "Lưu ảnh, file đính kèm từ chat" },
  { layer: "Deploy", tech: "Docker + k8s hoặc Railway", note: "Scale từng service độc lập" },
];

const phases = [
  {
    title: "Phase 1 — Webhook Gateway",
    time: "2–3 tuần",
    color: "#E6F1FB",
    textColor: "#0C447C",
    tasks: [
      "Tạo endpoint nhận webhook từ Facebook Graph API",
      "Verify signature HMAC-SHA256 (bắt buộc của Meta)",
      "Tạo endpoint tương tự cho Zalo OA API",
      "Normalize message event về schema chung: { platform, sender_id, text, attachments, timestamp }",
      "Đẩy vào Redis Streams / RabbitMQ",
    ],
  },
  {
    title: "Phase 2 — Conversation + Contact Service",
    time: "2–3 tuần",
    color: "#EEEDFE",
    textColor: "#3C3489",
    tasks: [
      "Consumer đọc queue, tạo / tìm Conversation theo platform + sender_id",
      "Contact deduplication: cùng SĐT / email → merge thành 1 contact",
      "Lưu toàn bộ message history vào Postgres",
      "Auto-assign conversation cho agent (round-robin hoặc rule-based)",
      "WebSocket: push event tới agent đang online",
    ],
  },
  {
    title: "Phase 3 — Custom CRM",
    time: "2–3 tuần",
    color: "#E1F5EE",
    textColor: "#085041",
    tasks: [
      "Thiết kế schema: contacts, deals, pipeline_stages, activities",
      "API CRUD cho contact và deal",
      "Gắn conversation vào deal / contact tự động",
      "Activity log: ghi lại mọi tương tác (chat, call, note)",
      "Report cơ bản: conversion rate, avg response time theo agent",
    ],
  },
  {
    title: "Phase 4 — Agent UI",
    time: "3–4 tuần",
    color: "#FAEEDA",
    textColor: "#633806",
    tasks: [
      "Unified Inbox: list conversation theo kênh, filter trạng thái",
      "Chat panel: hiển thị lịch sử, gửi tin nhắn đa kênh",
      "CRM Panel bên phải: thông tin contact, deal, note",
      "Canned responses: shortcut /ten để chèn câu trả lời mẫu",
      "Manager Dashboard: bảng KPI, assign / transfer conversation",
    ],
  },
  {
    title: "Phase 5 — Mở rộng kênh & tối ưu",
    time: "2–3 tuần",
    color: "#FAECE7",
    textColor: "#712B13",
    tasks: [
      "Tích hợp TikTok Comment API (reply comment công khai)",
      "Tích hợp Instagram DM qua Meta Graph API",
      "Rate limiting và retry logic cho mỗi platform",
      "Alerting: cảnh báo khi queue tắc hoặc webhook bị miss",
      "Load test toàn hệ thống, tối ưu query Postgres",
    ],
  },
];

export default function ArchitectureDiagram() {
  const [activeTab, setActiveTab] = useState("architecture");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        CRM Medical — Kiến trúc hệ thống
      </h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Multi-channel messaging + Custom CRM cho phòng khám
      </p>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #E5E7EB" }}>
        {[
          { id: "architecture", label: "Kiến trúc" },
          { id: "techstack", label: "Tech Stack" },
          { id: "roadmap", label: "Roadmap" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? "#111" : "#666",
              borderBottom: activeTab === tab.id ? "2px solid #111" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Architecture tab */}
      {activeTab === "architecture" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {layers.map((layer, i) => (
            <div key={layer.id}>
              <div
                style={{
                  background: layer.lightBg,
                  border: `1px solid ${layer.color}33`,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    background: layer.color,
                    color: "#fff",
                    borderRadius: 6,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  {layer.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {layer.nodes.map((node) => (
                    <div
                      key={node.name}
                      style={{
                        background: "#fff",
                        border: `1px solid ${layer.color}44`,
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: layer.lightText }}>{node.name}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{node.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              {i < layers.length - 1 && (
                <div style={{ textAlign: "center", color: "#aaa", fontSize: 18, lineHeight: "20px" }}>↓</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tech Stack tab */}
      {activeTab === "techstack" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#F3F4F6" }}>
              <th style={thStyle}>Layer</th>
              <th style={thStyle}>Technology</th>
              <th style={thStyle}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {techStack.map((row, i) => (
              <tr key={row.layer} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                <td style={tdStyle}><strong>{row.layer}</strong></td>
                <td style={{ ...tdStyle, color: "#534AB7", fontFamily: "monospace" }}>{row.tech}</td>
                <td style={{ ...tdStyle, color: "#555" }}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Roadmap tab */}
      {activeTab === "roadmap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {phases.map((phase, i) => (
            <div
              key={phase.title}
              style={{
                background: phase.color,
                borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: phase.textColor, fontSize: 15 }}>{phase.title}</span>
                <span
                  style={{
                    fontSize: 12,
                    background: "#fff",
                    color: phase.textColor,
                    borderRadius: 12,
                    padding: "2px 10px",
                    fontWeight: 500,
                  }}
                >
                  {phase.time}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {phase.tasks.map((task) => (
                  <li key={task} style={{ fontSize: 13, color: phase.textColor }}>{task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "1px solid #E5E7EB",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #F3F4F6",
  verticalAlign: "top",
};
