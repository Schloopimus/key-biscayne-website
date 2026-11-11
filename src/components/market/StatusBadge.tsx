export type StatusKey = 'in_progress' | 'pending' | 'approved' | 'rejected' | 'expired'

const LOOK: Record<StatusKey, [string, string, string]> = {
  in_progress: ['APPLICATION IN PROGRESS', '#e4eef8', '#245a8c'],
  expired: ['APPROVAL EXPIRED', '#fbe9e7', '#a3413a'],
  pending: ['PENDING REVIEW', '#fdf3d6', '#8a6c0c'],
  approved: ['APPROVED', '#e5f3ea', '#2f7a56'],
  rejected: ['NOT APPROVED', '#fbe9e7', '#a3413a'],
}

export const statusKey = (vendor: { status: Exclude<StatusKey, 'expired'>; expired: boolean }): StatusKey =>
  vendor.expired ? 'expired' : vendor.status

export function StatusBadge({ status }: { status: StatusKey }) {
  const [label, background, color] = LOOK[status]
  return (
    <span className="fm-status-badge" style={{ background, color }}>
      {label}
    </span>
  )
}
