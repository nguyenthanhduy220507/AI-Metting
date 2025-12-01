import Link from "next/link";
import { redirect } from "next/navigation";
import { Meeting } from "@/types/meeting";
import { MeetingDetailCard } from "@/components/meeting-detail-card";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3333";

async function fetchMeeting(meetingId: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/meetings/${meetingId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu cuộc họp");
  }
  return response.json();
}

type Params = {
  params: Promise<{ meetingId?: string; id?: string }>;
};

function normalizeMeetingId(params: { meetingId?: string; id?: string }): string | null {
  const raw = params.meetingId ?? params.id;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  if (raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") {
    return null;
  }
  return raw;
}

export default async function MeetingDetailPage({ params }: Params) {
  const resolvedParams = await params;
  const meetingId = normalizeMeetingId(resolvedParams);
  if (!meetingId) {
    redirect("/meetings");
  }

  try {
    const meeting = await fetchMeeting(meetingId);
    const audioUrl = meeting.uploads && meeting.uploads.length > 0
      ? `${API_BASE}/meetings/${meeting.id}/audio`
      : undefined;
    return (
      <main className="space-y-8">
        <MeetingDetailCard meeting={meeting} audioUrl={audioUrl} />
      </main>
    );
  } catch (error) {
    return (
      <main className="card space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          Không thể tải dữ liệu cuộc họp
        </h1>
        <p className="text-[var(--muted)]">
          {error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định."}
        </p>
        <Link href="/meetings" className="secondary-button">
          Quay lại danh sách meetings
        </Link>
      </main>
    );
  }
}

