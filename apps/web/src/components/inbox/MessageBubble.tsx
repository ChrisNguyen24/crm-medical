import { format } from "date-fns";

interface Message {
  id:          string;
  direction:   "inbound" | "outbound";
  contentType: string;
  text?:       string;
  attachments: Array<{ type: string; url: string; name?: string }>;
  createdAt:   string;
}

export function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === "outbound";

  return (
    <div style={{
      display:       "flex",
      justifyContent: isOut ? "flex-end" : "flex-start",
      marginBottom:  8,
    }}>
      <div style={{ maxWidth: "72%" }}>
        {/* Text content */}
        {msg.text && (
          <div style={{
            background:   isOut ? "#3B82F6" : "#F3F4F6",
            color:        isOut ? "#fff" : "#111",
            borderRadius: isOut ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
            padding:      "8px 12px",
            fontSize:     13,
            lineHeight:   1.5,
            whiteSpace:   "pre-wrap",
            wordBreak:    "break-word",
          }}>
            {msg.text}
          </div>
        )}

        {/* Attachments */}
        {msg.attachments?.map((att, i) => (
          <div key={i} style={{ marginTop: 4 }}>
            {att.type === "image" ? (
              <img
                src={att.url}
                alt=""
                style={{ maxWidth: "100%", borderRadius: 8, display: "block" }}
              />
            ) : (
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          6,
                  padding:      "6px 10px",
                  background:   "#F3F4F6",
                  borderRadius: 8,
                  fontSize:     12,
                  color:        "#3B82F6",
                }}
              >
                📎 {att.name ?? "File"}
              </a>
            )}
          </div>
        ))}

        <div style={{
          fontSize:  10,
          color:     "#9CA3AF",
          marginTop: 2,
          textAlign: isOut ? "right" : "left",
        }}>
          {format(new Date(msg.createdAt), "HH:mm")}
        </div>
      </div>
    </div>
  );
}
