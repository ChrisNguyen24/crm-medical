"use client";
import { useState } from "react";

const AVATAR_COLORS: [string, string][] = [
  ["#3B82F6", "#EFF6FF"],
  ["#8B5CF6", "#F5F3FF"],
  ["#EC4899", "#FDF2F8"],
  ["#F59E0B", "#FFFBEB"],
  ["#10B981", "#ECFDF5"],
  ["#EF4444", "#FEF2F2"],
  ["#06B6D4", "#ECFEFF"],
  ["#F97316", "#FFF7ED"],
];

function nameToColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const [textColor, bgColor] = nameToColor(name);

  const fallback = (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   "50%",
      background:     bgColor,
      color:          textColor,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontSize:       size * 0.38,
      fontWeight:     700,
      flexShrink:     0,
      userSelect:     "none",
    }}>
      {initials}
    </div>
  );

  if (!url || imgError) return fallback;

  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
}
