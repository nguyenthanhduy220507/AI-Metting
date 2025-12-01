import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const navLinks = [
  { href: "/", label: "Tổng quan" },
  { href: "/upload", label: "Upload" },
  { href: "/meetings", label: "Meetings" },
  { href: "/speakers", label: "Speakers" },
];

export const metadata: Metadata = {
  title: "Meeting Flow Studio",
  description: "Quản lý cuộc họp, đăng ký giọng nói và nhận biên bản tức thì.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-[var(--text)]`}
      >
        <div className="app-shell flex min-h-screen flex-col gap-10">
          <header className="glass-pane rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-5 shadow-sm shadow-[rgba(0,72,49,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white font-semibold text-lg">
                  MN
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                    Meeting Notes
                  </p>
                  <p className="text-lg font-semibold text-[var(--text)]">
                    AI Control Center
                  </p>
                </div>
              </Link>
              <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--muted)]">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full px-4 py-2 transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="/upload"
                  className="primary-button text-sm"
                >
                  Bắt đầu xử lý
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1 space-y-10">{children}</main>

          <footer className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-6 text-sm text-[var(--muted)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} Meeting Flow Studio.</p>
              <p>Lắng nghe - Hiểu nội dung - Ghi lại tự động.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
