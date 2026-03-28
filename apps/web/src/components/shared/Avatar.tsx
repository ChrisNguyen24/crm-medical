export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   "50%",
      background:     "#E5E7EB",
      color:          "#374151",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontSize:       size * 0.38,
      fontWeight:     600,
      flexShrink:     0,
    }}>
      {initials}
    </div>
  );
}
