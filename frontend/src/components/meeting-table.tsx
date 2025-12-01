import clsx from "clsx";
import Link from "next/link";
import { Meeting } from "@/types/meeting";
import { StatusBadge } from "./status-badge";

type MeetingTableProps = {
  meetings: Meeting[];
  highlightId?: string;
};

export function MeetingTable({ meetings, highlightId }: MeetingTableProps) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            <th className="px-5 py-4">Cuộc họp</th>
            <th className="px-5 py-4">Trạng thái</th>
            <th className="px-5 py-4">Cập nhật gần nhất</th>
            <th className="px-5 py-4 text-right">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => {
            const isHighlight = meeting.id === highlightId;
            return (
              <tr
                key={meeting.id}
                className={clsx(
                  "border-t border-[var(--border)] transition hover:bg-[var(--surface-muted)]",
                  isHighlight && "bg-[var(--surface-muted)]"
                )}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-[var(--text)]">
                    {meeting.title ?? "Chưa đặt tên"}
                  </div>
                      <p className="text-xs text-[var(--muted)]">#{meeting.id.slice(0, 8)}</p>
                    </div>
                    {isHighlight && (
                      <span className="pill bg-[var(--accent)]/30 text-[var(--primary)] text-[10px]">
                        mới
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={meeting.status} />
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {new Date(meeting.updatedAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="inline-flex items-center text-sm font-semibold text-[var(--primary)]"
                  >
                    Mở biên bản →
                  </Link>
                </td>
              </tr>
            );
          })}
          {meetings.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-[var(--muted)]">
                Chưa có cuộc họp nào được upload.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

