import { MeetingStatus } from '@/types/meeting';
import clsx from 'clsx';

const statusStyles: Record<MeetingStatus, string> = {
  UPLOADED: 'border border-[var(--border)] text-[var(--text)] bg-white',
  PROCESSING: 'border border-[var(--accent)] text-[var(--primary)] bg-[var(--surface-muted)]',
  COMPLETED: 'border border-emerald-600 text-emerald-700 bg-emerald-50',
  FAILED: 'border border-rose-600 text-rose-700 bg-rose-50',
};

export function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

