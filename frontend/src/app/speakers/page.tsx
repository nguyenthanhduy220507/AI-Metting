"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Speaker } from "@/types/speaker";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3333";

const statusCopy: Record<Speaker["status"], { label: string; color: string }> = {
  PENDING: { label: "Chờ xử lý", color: "bg-[var(--surface-muted)] text-[var(--muted)]" },
  ENROLLING: { label: "Đang đăng ký", color: "bg-blue-100 text-blue-800" },
  ACTIVE: { label: "Sẵn sàng", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Lỗi", color: "bg-red-100 text-red-800" },
};

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSpeakers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/speakers`);
      if (!response.ok) {
        throw new Error("Không thể tải danh sách speaker");
      }
      const data: Speaker[] = await response.json();
      setSpeakers(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Không tải được danh sách speaker",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên speaker");
      return;
    }
    if (!files || files.length === 0) {
      setError("Cần ít nhất một file audio để đăng ký");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      Array.from(files).forEach((file) => formData.append("samples", file));

      const response = await fetch(`${API_BASE}/speakers`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Đăng ký giọng nói thất bại");
      }

      setSuccess("Đăng ký giọng nói thành công");
      setName("");
      setFiles(null);
      const fileInput = document.getElementById(
        "samples-input",
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
      await fetchSpeakers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSpeakers = useMemo(() => speakers.length, [speakers]);

  return (
    <main className="flex flex-col gap-10">
      <section className="card space-y-4">
        <span className="pill bg-[var(--surface-muted)] text-[var(--primary)]">
          Voice Enrollment
        </span>
        <h1 className="text-3xl font-semibold text-[var(--text)]">
          Huấn luyện giọng nói cho từng thành viên
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Chúng tôi lưu embedding vào `speaker_db.pkl`, giúp pipeline nhận diện chính xác hơn
          khi xử lý timeline cuộc họp.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text)]">
            Tên speaker
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Nguyen Van A"
              className="input-field"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--text)]">
            File mẫu (1-5 file)
            <input
              id="samples-input"
              type="file"
              accept="audio/*,.wav,.mp3,.flac,.ogg,.webm"
              multiple
              onChange={(event) => {
                const selectedFiles = event.target.files;
                if (selectedFiles) {
                  // Validate file types on client side
                  const allowedTypes = [
                    'audio/wav',
                    'audio/wave',
                    'audio/x-wav',
                    'audio/mpeg',
                    'audio/mp3',
                    'audio/mpeg3',
                    'audio/x-mpeg-3',
                    'audio/flac',
                    'audio/x-flac',
                    'audio/ogg',
                    'audio/webm',
                  ];
                  const invalidFiles = Array.from(selectedFiles).filter(
                    (file) => !allowedTypes.includes(file.type.toLowerCase()),
                  );
                  if (invalidFiles.length > 0) {
                    setError(
                      `File không hợp lệ. Chỉ chấp nhận audio files (WAV, MP3, FLAC, OGG, WEBM). File không hợp lệ: ${invalidFiles.map((f) => f.name).join(', ')}`,
                    );
                    event.target.value = '';
                    return;
                  }
                }
                setFiles(selectedFiles);
              }}
              className="rounded-2xl border border-dashed border-[var(--border)] bg-white/60 px-4 py-5 text-[var(--muted)]"
            />
          </label>

          <div className="space-y-2 text-sm text-[var(--muted)]">
            <p>Gợi ý: mỗi file 5-10 giây, không có tiếng ồn nền.</p>
            <p className="text-xs">Định dạng hỗ trợ: WAV, MP3, FLAC, OGG, WEBM (chỉ audio, không hỗ trợ video).</p>
            {error && (
              <p className="text-red-500" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-600" role="status">
                {success}
              </p>
            )}
          </div>

          <div className="flex items-end justify-end">
            <button type="submit" disabled={isSubmitting} className="primary-button">
              {isSubmitting ? "Đang đăng ký..." : "Đăng ký giọng nói"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text)]">Danh sách speaker</h2>
            <p className="text-sm text-[var(--muted)]">
              {isLoading ? "Đang tải..." : `${totalSpeakers} speaker đã sẵn sàng`}
            </p>
          </div>
          <button onClick={() => fetchSpeakers()} className="secondary-button text-sm">
            Làm mới
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              <tr>
                <th className="pb-3">Tên</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pb-3">Số mẫu</th>
                <th className="pb-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text)]">
              {speakers.map((speaker) => (
                <tr key={speaker.id} className="border-t border-[var(--border)]">
                  <td className="py-4 font-semibold capitalize">{speaker.name}</td>
                  <td className="py-4">
                    <span
                      className={`pill text-xs ${statusCopy[speaker.status].color}`}
                    >
                      {statusCopy[speaker.status].label}
                    </span>
                  </td>
                  <td className="py-4">{speaker.samples?.length ?? 0}</td>
                  <td className="py-4">
                    {new Date(speaker.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              ))}
              {!speakers.length && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                    Chưa có speaker nào được đăng ký
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

