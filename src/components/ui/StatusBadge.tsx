const variants = {
  active:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border border-slate-200',
  urgent:   'bg-red-100 text-red-700 border border-red-200',
  warning:  'bg-amber-100 text-amber-700 border border-amber-200',
  info:     'bg-[#E6F4EE] text-[#006B47] border border-[#00A86B]/20',
  safe:     'bg-green-100 text-green-700 border border-green-200',
} as const;

interface StatusBadgeProps {
  status: keyof typeof variants;
  label: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, dot = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[status]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          status === 'active' ? 'bg-emerald-500' :
          status === 'urgent' ? 'bg-red-500' :
          status === 'warning' ? 'bg-amber-500' :
          status === 'info' ? 'bg-[#00A86B]' :
          status === 'safe' ? 'bg-green-500' :
          'bg-slate-400'
        }`} />
      )}
      {label}
    </span>
  );
}
