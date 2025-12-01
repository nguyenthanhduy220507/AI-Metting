import Link from "next/link";

const journey = [
  {
    title: "Upload thông minh",
    description:
      "Tự động chuẩn hóa âm lượng, phát hiện ngôn ngữ và chia nhỏ file dài >10 phút.",
    href: "/upload",
    action: "Tải file cuộc họp",
  },
  {
    title: "Theo dõi tiến độ",
    description:
      "Worker backend + python status rõ ràng, cập nhật mỗi khi segment hoàn tất.",
    href: "/meetings",
    action: "Xem danh sách",
  },
  {
    title: "Đăng ký giọng nói",
    description:
      "Huấn luyện nhanh với 1-3 mẫu để hệ thống nhận diện chính xác người đang nói.",
    href: "/speakers",
    action: "Đăng ký ngay",
  },
];

const highlights = [
  { label: "Thời gian xử lý trung bình", value: "~6 phút/audio 20 phút" },
  { label: "Độ chính xác diarization", value: "± 92% (multi-speaker)" },
  { label: "Số speaker đã lưu", value: "50+ mẫu" },
];

export default function Home() {
  return (
    <main className="space-y-10">
      <section className="card relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <span className="pill bg-[var(--surface-muted)] text-[var(--primary)]">
            Meeting Flow Studio
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-[var(--text)] sm:text-5xl">
            Trợ lý tạo biên bản họp dựa trên giọng nói, chỉ cần một thao tác upload.
          </h1>
          <p className="max-w-2xl text-lg text-[var(--muted)]">
            Kết hợp pipeline Python (WhisperX, Pyannote, ECAPA) với NestJS + Next.js
            để chuyển mọi cuộc họp thành insight rõ ràng, dễ chia sẻ.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/upload" className="primary-button text-base">
              Tải file & bắt đầu
            </Link>
            <Link href="/meetings" className="secondary-button text-sm">
              Xem biên bản gần nhất
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-2/5 bg-[var(--surface-muted)] opacity-60 blur-3xl" />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {journey.map((item) => (
          <div
            key={item.title}
            className="card border-none bg-[var(--surface-muted)] p-6 shadow-none transition hover:-translate-y-2 hover:shadow-lg"
        >
          <h2 className="text-xl font-semibold text-[var(--text)]">
              {item.title}
          </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{item.description}</p>
        <Link
              href={item.href}
              className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--primary)]"
            >
              {item.action} →
            </Link>
          </div>
        ))}
      </section>

      <section className="grid gap-6 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.label}>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text)]">
              {item.value}
          </p>
          </div>
        ))}
      </section>
      </main>
  );
}
