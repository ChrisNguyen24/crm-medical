const CHANNEL_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  facebook:  { label: "FB",   bg: "#1877F2", color: "#fff" },
  zalo:      { label: "Zalo", bg: "#0068FF", color: "#fff" },
  tiktok:    { label: "TT",   bg: "#010101", color: "#fff" },
  instagram: { label: "IG",   bg: "#E1306C", color: "#fff" },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? { label: channel, bg: "#6B7280", color: "#fff" };
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      justifyContent:"center",
      width:         28,
      height:        18,
      borderRadius:  4,
      fontSize:      10,
      fontWeight:    700,
      background:    cfg.bg,
      color:         cfg.color,
      flexShrink:    0,
    }}>
      {cfg.label}
    </span>
  );
}
