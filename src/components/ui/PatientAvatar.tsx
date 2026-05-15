const AVATAR_COLORS = [
  'bg-[#00A86B]', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-[#006B47]', 'bg-indigo-500', 'bg-pink-500',
];

function getColor(name: string): string {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface PatientAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export function PatientAvatar({ name, size = 'md' }: PatientAvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} ${getColor(name)} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 select-none`}
    >
      {getInitials(name)}
    </div>
  );
}
