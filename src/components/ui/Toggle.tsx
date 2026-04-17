// Pure-CSS inline-style toggle — no Tailwind, no Framer Motion
// Spec: track 44×24px, thumb 20×20px, thumb ON: translateX(20px)

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function Toggle({ enabled, onChange, label }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!enabled)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
    >
      {/* Track */}
      <div
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: enabled ? '#0EA5E9' : '#CBD5E1',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
        }}
      >
        {/* Thumb — left:2px is the base position; translateX(20px) = ON */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transform: enabled ? 'translateX(20px)' : 'translateX(0px)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>

      {label && (
        <span style={{ fontSize: 13, color: '#64748b', userSelect: 'none' }}>
          {label}
        </span>
      )}
    </div>
  );
}
