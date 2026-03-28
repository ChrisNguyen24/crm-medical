"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/inbox");
    } catch (err: any) {
      setError(err.message ?? "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F3F4F6",
    }}>
      <div style={{
        background:   "#fff",
        borderRadius: 12,
        padding:      "40px 36px",
        width:        "100%",
        maxWidth:     380,
        boxShadow:    "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>CRM Medical</h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 28 }}>Đăng nhập để tiếp tục</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width:        "100%",
                padding:      "9px 12px",
                border:       "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize:     14,
                outline:      "none",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width:        "100%",
                padding:      "9px 12px",
                border:       "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize:     14,
                outline:      "none",
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding:      "10px",
              background:   "#3B82F6",
              color:        "#fff",
              border:       "none",
              borderRadius: 8,
              fontSize:     14,
              fontWeight:   600,
              cursor:       loading ? "default" : "pointer",
              opacity:      loading ? 0.7 : 1,
              marginTop:    4,
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
