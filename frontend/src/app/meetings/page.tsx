import { Meeting } from "@/types/meeting";
import { MeetingTable } from "@/components/meeting-table";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3333";

async function fetchMeetings(): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/meetings`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Không thể tải danh sách cuộc họp");
  }
  return response.json();
}

type PageProps = {
  searchParams?: Promise<{ highlight?: string }>;
};

export default async function MeetingsPage({ searchParams }: PageProps) {
  const meetings = await fetchMeetings();
  const latestMeeting = meetings[0];
  const resolvedParams = searchParams ? await searchParams : {};
  const highlightId = resolvedParams?.highlight;

  return (
    <main className="space-y-8">
      <section className="card space-y-4">
        <span className="pill bg-[var(--surface-muted)] text-[var(--primary)]">
          Meetings
        </span>
        <h1 className="text-3xl font-semibold text-[var(--text)]">
          Theo dõi tiến độ xử lý & mở biên bản chi tiết
        </h1>
        <p className="text-[var(--muted)]">
          Danh sách cập nhật theo thời gian thực. Bấm “Mở biên bản” để xem đoạn transcript,
          summary và payload đầy đủ.
        </p>
        {latestMeeting && (
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
            Cuộc họp gần nhất:{" "}
            <strong className="text-[var(--text)]">
              {latestMeeting.title ?? "Chưa đặt tên"}
            </strong>{" "}
            ({new Date(latestMeeting.updatedAt).toLocaleString("vi-VN")})
          </div>
        )}
      </section>

      <MeetingTable meetings={meetings} highlightId={highlightId} />
    </main>
  );
}
