import { useTheme } from '../contexts/ThemeContext';

export interface ChartTheme {
  grid: string;
  axisStroke: string;
  tickFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  series: string[];
}

export function useChartTheme(): ChartTheme {
  const { isDark } = useTheme();

  const series = [
    '#00A86B', '#8b5cf6', '#10b981', '#f59e0b',
    '#f97316', '#ec4899', '#84cc16', '#6366f1',
  ];

  if (isDark) {
    return {
      grid: 'rgba(148,163,184,0.15)',
      axisStroke: 'transparent',
      tickFill: '#94A3B8',
      tooltipBg: '#1e293b',
      tooltipBorder: 'rgba(255,255,255,0.10)',
      tooltipText: '#e2e8f0',
      series,
    };
  }

  return {
    grid: 'rgba(148,163,184,0.15)',
    axisStroke: 'transparent',
    tickFill: '#94a3b8',
    tooltipBg: '#1e293b',
    tooltipBorder: 'rgba(255,255,255,0.10)',
    tooltipText: '#e2e8f0',
    series,
  };
}
