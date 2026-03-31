import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'secondary' | 'safe' | 'caution';
  subtitle?: string;
}

export function KPICard({ title, value, icon, trend, color = 'primary', subtitle }: KPICardProps) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    safe: 'from-safe-500 to-safe-600',
    caution: 'from-caution-500 to-caution-600',
  };

  return (
    <div className="glass-effect rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {subtitle && !trend && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center text-sm">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-safe-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger-500 mr-1" />
              )}
              <span className={trend.isPositive ? 'text-safe-500' : 'text-danger-500'}>
                {trend.value}%
              </span>
              <span className="text-gray-500 ml-1">{subtitle || 'vs. hier'}</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
