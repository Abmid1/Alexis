interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  small?: boolean;
}

export function MetricCard({ label, value, change, changeType = 'up', small }: MetricCardProps) {
  const changeCls = changeType === 'up' ? 'up' : changeType === 'down' ? 'dn' : '';
  return (
    <div className="metric-card">
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: small ? 16 : 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
      {change && <div style={{ fontSize: 10, marginTop: 3 }} className={changeCls}>{change}</div>}
    </div>
  );
}
