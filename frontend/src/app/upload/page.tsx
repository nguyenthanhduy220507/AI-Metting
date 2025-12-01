"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3333";

const steps = [
  { title: "Chuẩn bị file", description: "Hỗ trợ mp3, wav, mp4 ≤ 1GB" },
  {
    title: "Upload & đặt tên",
    description: "Thêm tiêu đề/ghi chú để dễ tìm kiếm",
  },
  {
    title: "Theo dõi trạng thái",
    description: "Tự động phân đoạn và cập nhật tiến độ",
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setMessage("Vui lòng chọn file audio");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    if (title) formData.append("title", title);
    if (description) formData.append("description", description);
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/meetings`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload thất bại");
      }
      const data = await response.json();
      if (!data?.id) {
        throw new Error("Không nhận được ID cuộc họp từ backend");
      }
      setMeetingId(data.id);
      setMessage("Upload thành công, đang chuyển tới danh sách tiến độ...");
      router.push(`/meetings?highlight=${data.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-8">
      <section className="card">
        <div className="flex flex-wrap items-center gap-4">
          <span className="pill bg-[var(--surface-muted)] text-[var(--primary)]">
            Upload audio/video
          </span>
          <p className="text-sm text-[var(--muted)]">
            Hệ thống sẽ tự động gửi file sang python-service-metting để xử lý.
        </p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">
          Gửi file cuộc họp & bắt đầu pipeline
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Bước {index + 1}
              </p>
              <h3 className="mt-2 font-semibold text-[var(--text)]">{step.title}</h3>
              <p className="text-sm text-[var(--muted)]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="title">
            Tiêu đề (tuỳ chọn)
          </label>
          <input
            id="title"
            className="input-field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Họp Sprint 26/11"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="description">
            Ghi chú
          </label>
          <textarea
            id="description"
            className="text-area"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Nội dung chính, thành viên tham gia..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="file">
            File audio/video
          </label>
          <label
            htmlFor="file"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--primary)] bg-[var(--surface-muted)] px-4 py-5 text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--primary)]">
              ⬆
            </div>
            <div className="text-sm">
              <p className="font-semibold">
                {file ? file.name : "Chọn hoặc kéo-thả file tại đây"}
              </p>
              <p className="text-[var(--muted)]">
                Hỗ trợ MP3, WAV, MP4. Dung lượng tối đa 1GB.
              </p>
            </div>
          </label>
          <input
            id="file"
            type="file"
            accept="audio/*,video/*"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="primary-button w-full justify-center">
          {isSubmitting ? "Đang upload..." : "Bắt đầu xử lý"}
        </button>
      </form>

      {message && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-4 text-center text-sm text-[var(--text)]">
          {message}
        </div>
      )}
    </main>
  );
}
