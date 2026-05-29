// src/portal/WarRoomMessage.tsx
//
// Renders one war_room_messages row. Detects attachment metadata in the
// `attachments` jsonb and shows a file chip if the message references a
// document. Bubble style varies by sender_type (client = right-aligned navy,
// agent = left-aligned cream).

import { FileText, Download } from "lucide-react";

interface AttachmentLike {
  type?: string;
  document_id?: string;
  file_url?: string;
  name?: string;
  file_type?: string;
  file_size?: number;
  category?: string;
}

interface MessageProps {
  message: {
    id: string;
    sender_type: "agent" | "client" | "system";
    body: string;
    attachments: unknown;
    created_at: string;
  };
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes < 1) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function normalizeAttachments(raw: unknown): AttachmentLike[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as AttachmentLike[];
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return [];
    return [obj as AttachmentLike];
  }
  return [];
}

export default function WarRoomMessage({ message }: MessageProps) {
  const isClient = message.sender_type === "client";
  const isSystem = message.sender_type === "system";

  const attachments = normalizeAttachments(message.attachments).filter(
    (a) => a && (a.type === "document" || a.document_id || a.file_url),
  );

  if (isSystem) {
    return (
      <div className="text-center">
        <div className="inline-block text-[11px] uppercase tracking-wider text-[#91a1ba] px-3 py-1 rounded-full bg-[#f5f3ee]">
          {message.body}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] ${isClient ? "items-end" : "items-start"} flex flex-col gap-1.5`}
      >
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm",
            isClient
              ? "bg-[#1a1f2e] text-white rounded-br-md"
              : "bg-[#f5f3ee] text-[#1a1f2e] rounded-bl-md border border-[#e8e3d8]",
          ].join(" ")}
        >
          {message.body && (
            <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
          )}

          {attachments.length > 0 && (
            <div className={`${message.body ? "mt-3" : ""} flex flex-col gap-2`}>
              {attachments.map((att, i) => (
                
                  key={i}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                    isClient
                      ? "bg-white/10 border-white/20 hover:bg-white/15"
                      : "bg-white border-[#e8e3d8] hover:border-[#91a1ba]",
                  ].join(" ")}
                >
                  <FileText
                    size={18}
                    className={isClient ? "text-white" : "text-[#1a1f2e]"}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        isClient ? "text-white" : "text-[#1a1f2e]"
                      }`}
                    >
                      {att.name || "File"}
                    </div>
                    <div
                      className={`text-[10px] ${
                        isClient ? "text-white/70" : "text-[#91a1ba]"
                      }`}
                    >
                      {att.category && att.category !== "other"
                        ? `${att.category} · `
                        : ""}
                      {formatSize(att.file_size)}
                    </div>
                  </div>
                  <Download
                    size={14}
                    className={isClient ? "text-white/80" : "text-[#91a1ba]"}
                  />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className={`text-[11px] text-[#91a1ba] ${isClient ? "pr-2" : "pl-2"}`}>
          {isClient ? "You" : "Agent"} · {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
