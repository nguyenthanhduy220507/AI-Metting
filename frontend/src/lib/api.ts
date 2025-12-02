import "server-only";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:3333";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Backend request failed (${response.status}): ${text || response.statusText}`
    );
  }
  return response.json() as Promise<T>;
}

export async function fetchMeetings<T = unknown>(): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/meetings`, {
    cache: "no-store",
    next: { revalidate: 0, tags: ["meetings"] },
  });
  return handleResponse<T>(res);
}

export async function fetchMeeting<T = unknown>(meetingId: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/meetings/${meetingId}`, {
    cache: "no-store",
    next: { revalidate: 0, tags: [`meeting-${meetingId}`] },
  });
  return handleResponse<T>(res);
}

