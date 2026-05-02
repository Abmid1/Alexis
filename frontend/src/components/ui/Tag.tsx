import { LeadStatus, PropertyType, PropertyStatus } from '@/lib/types';

const statusMap: Record<string, string> = {
  Hot: 't-hot', Warm: 't-warm', New: 't-new', Cold: 't-cold', Qualified: 't-qual',
  sale: 't-sale', rent: 't-rent', land: 't-land',
  Verified: 't-verif', Pending: 't-pend',
  Done: 't-done', Scheduled: 't-sched', 'AI will send': 't-ai', Overdue: 't-overdue', Active: 't-active',
  'AI active': 't-ai', 'Needs you': 't-agent',
  Escalates: 't-hot', Auto: 't-ai',
  hot: 't-hot', warm: 't-warm', new: 't-new', cold: 't-cold',
};

export function Tag({ label }: { label: string }) {
  const cls = statusMap[label] || 't-new';
  return <span className={`tag ${cls}`}>{label}</span>;
}
