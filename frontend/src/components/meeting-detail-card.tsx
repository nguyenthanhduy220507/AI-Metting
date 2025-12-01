import clsx from "clsx";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Meeting } from "@/types/meeting";
import { StatusBadge } from "./status-badge";
import { TimelineWithAudio } from "./timeline-with-audio";

type Props = {
  meeting: Meeting;
  audioUrl?: string;
};

const statusSteps = [
  { key: "UPLOADED", label: "Upload thành công" },
  { key: "PROCESSING", label: "Đang xử lý/segment" },
  { key: "COMPLETED", label: "Hoàn tất & tổng hợp" },
] as const;

export function MeetingDetailCard({ meeting, audioUrl }: Props) {
  return (
    <section className="space-y-8">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <Link href="/meetings" className="text-[var(--primary)]">
            ← Quay lại danh sách
          </Link>
          <span>Meeting #{meeting.id.slice(0, 8)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-semibold text-[var(--text)]">
            {meeting.title ?? "Cuộc họp chưa đặt tên"}
          </h1>
          <StatusBadge status={meeting.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Cập nhật lần cuối: {new Date(meeting.updatedAt).toLocaleString("vi-VN")}
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Tiến độ xử lý</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {statusSteps.map((step) => {
            const reached =
              statusSteps.findIndex((s) => s.key === meeting.status) >=
              statusSteps.findIndex((s) => s.key === step.key);
            return (
              <div
                key={step.key}
                className={clsx(
                  "rounded-2xl border px-4 py-3",
                  reached
                    ? "border-[var(--primary)] bg-[var(--surface-muted)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                )}
              >
                <p className="text-xs uppercase tracking-[0.3em]">
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
        {meeting.status !== "COMPLETED" && (
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            Hệ thống đang xử lý, hãy làm mới sau ít phút để xem timeline cập nhật.
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--text)]">Tóm tắt nhanh</h2>
        <div className="prose prose-sm mt-4 max-w-none text-[var(--text)] prose-headings:text-[var(--text)] prose-strong:text-[var(--text)]">
          {meeting.summary ? (
            <ReactMarkdown>{meeting.summary}</ReactMarkdown>
          ) : (
            <p className="text-[var(--muted)]">
              Python-service chưa trả summary cho cuộc họp này.
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        {audioUrl && meeting.rawTranscript && meeting.rawTranscript.length > 0 ? (
          <TimelineWithAudio
            audioUrl={audioUrl}
            transcript={meeting.rawTranscript}
          />
        ) : (
          <>
            <h2 className="text-lg font-semibold text-[var(--text)]">Timeline phát biểu</h2>
            <div className="space-y-3 text-sm">
              {meeting.formattedLines?.length ? (
                meeting.formattedLines.map((line, index) => (
                  <div
                    key={`${line.timestamp}-${index}`}
                    className="rounded-2xl border border-[var(--border)] bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                      {line.timestamp ?? "00:00"}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text)]">{line.speaker}</p>
                    <p className="text-[var(--muted)]">{line.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-[var(--muted)]">
                  Chưa có transcript format cho cuộc họp này.
                </p>
              )}
            </div>
          </>
        )}
      </div>

    </section>
  );
}

