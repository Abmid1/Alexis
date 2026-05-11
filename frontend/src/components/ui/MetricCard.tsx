interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  small?: boolean;
  icon?: string;
}

export function MetricCard({ label, value, change, changeType = 'up', small, icon }: MetricCardProps) {
  const isUp   = changeType === 'up';
  const isDown = changeType === 'down';

  return (
    <div className="metric-card">
      {/* Label row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {label}
        </div>
        {icon && (
          <div style={{
            fontSize: 16,
            lineHeight: 1,
            opacity: 0.5,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: small ? 26 : 36,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: change ? 10 : 0,
      }}>
        {value}
      </div>

      {/* Change badge */}
      {change && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 500,
          color: isDown ? '#F87171' : isUp ? '#34D399' : 'var(--text-muted)',
          background: isDown ? 'rgba(248,113,113,0.1)' : isUp ? 'rgba(52,211,153,0.1)' : 'transparent',
          padding: isDown || isUp ? '2px 7px' : '0',
          borderRadius: 20,
        }}>
          {isUp   && <span>↑</span>}
          {isDown && <span>↓</span>}
          {change}
        </div>
      )}
    </div>
  );
}
