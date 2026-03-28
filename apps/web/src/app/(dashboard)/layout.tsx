"use client";
import { useEffect }    from "react";
import { useRouter }    from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketEvents } from "@/hooks/useSocket";

const NAV_ITEMS = [
  { href: "/inbox",             icon: "💬", label: "Hộp thư" },
  { href: "/contacts",          icon: "👥", label: "Liên hệ" },
  { href: "/deals",             icon: "🤝", label: "Deal" },
  { href: "/reports",           icon: "📊", label: "Báo cáo" },
  { href: "/settings/channels",          icon: "⚙️",  label: "Kênh kết nối" },
  { href: "/settings/canned-responses", icon: "💾",  label: "Câu trả lời mẫu" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hydrate, logout } = useAuthStore();
  const router = useRouter();
  useSocketEvents();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <nav style={{
        width:      60,
        background: "#1E293B",
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        padding:    "16px 0",
        gap:        4,
        flexShrink: 0,
      }}>
        <div style={{
          width:        36,
          height:       36,
          background:   "#3B82F6",
          borderRadius: 10,
          display:      "flex",
          alignItems:   "center",
          justifyContent:"center",
          color:        "#fff",
          fontWeight:   700,
          fontSize:     14,
          marginBottom: 16,
        }}>
          CM
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = typeof window !== "undefined" && window.location.pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                width:        44,
                height:       44,
                display:      "flex",
                alignItems:   "center",
                justifyContent:"center",
                borderRadius: 10,
                fontSize:     20,
                background:   isActive ? "#334155" : "transparent",
                textDecoration:"none",
              }}
            >
              {item.icon}
            </a>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={logout}
          title="Đăng xuất"
          style={{
            width:      44,
            height:     44,
            display:    "flex",
            alignItems: "center",
            justifyContent:"center",
            borderRadius: 10,
            fontSize:   18,
            background: "transparent",
            border:     "none",
            cursor:     "pointer",
            color:      "#9CA3AF",
          }}
        >
          🚪
        </button>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {children}
      </main>
    </div>
  );
}
