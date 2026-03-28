import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Medical",
  description: "Omnichannel CRM cho phòng khám",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
