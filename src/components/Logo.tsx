/**
 * Logo component — OrdoSur Brand Kit v1
 *
 * Renders any logo variant from `src/assets/brand/` as a sized <img>.
 * The component is intentionally dumb (no routing, no state) so it can be
 * dropped anywhere — Sidebar, Header, Auth pages, Print header, etc.
 *
 * @example
 * // Light sidebar header
 * <Logo variant="horizontal-light" size="md" />
 *
 * @example
 * // Dark topbar
 * <Logo variant="horizontal-dark" size="sm" className="opacity-90" />
 *
 * @example
 * // Standalone symbol (favicon-style)
 * <Logo variant="symbol-primary" size="lg" />
 */

import logHorizontalLight from '@/assets/brand/ordosur_logo_horizontal_light.svg';
import logHorizontalDark  from '@/assets/brand/ordosur_logo_horizontal_dark.svg';
import logVertical        from '@/assets/brand/ordosur_logo_vertical.svg';
import symPrimary         from '@/assets/brand/ordosur_symbol_primary.svg';
import symDark            from '@/assets/brand/ordosur_symbol_dark.svg';
import symWhite           from '@/assets/brand/ordosur_symbol_white.svg';

// ── Types ────────────────────────────────────────────────────────────────────

export type LogoVariant =
  | 'horizontal-light'   // navy text — use on light / paper backgrounds
  | 'horizontal-dark'    // white text — use on dark / ink-navy backgrounds
  | 'vertical'           // symbol above logotype — square-ish layouts
  | 'symbol-primary'     // circle symbol only — navy bg, green check
  | 'symbol-dark'        // circle symbol only — dark variant
  | 'symbol-white';      // circle symbol only — white bg, green check

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  /** Which logo asset to render. Defaults to `'horizontal-light'`. */
  variant?: LogoVariant;
  /**
   * Preset height:
   * - `sm`  → 24 px  (compact nav, breadcrumbs)
   * - `md`  → 32 px  (standard topbar / sidebar)
   * - `lg`  → 48 px  (auth pages, landing sections)
   * - `xl`  → 80 px  (hero banners, PDF headers)
   */
  size?: LogoSize;
  /** Additional Tailwind / CSS classes forwarded to the <img> element. */
  className?: string;
  /** Alt text override. Defaults to "Ordosur". */
  alt?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ASSET_MAP: Record<LogoVariant, string> = {
  'horizontal-light': logHorizontalLight,
  'horizontal-dark':  logHorizontalDark,
  'vertical':         logVertical,
  'symbol-primary':   symPrimary,
  'symbol-dark':      symDark,
  'symbol-white':     symWhite,
};

const HEIGHT_MAP: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 80,
};

// ── Component ────────────────────────────────────────────────────────────────

export function Logo({
  variant  = 'horizontal-light',
  size     = 'md',
  className,
  alt      = 'Ordosur',
}: LogoProps) {
  const src    = ASSET_MAP[variant];
  const height = HEIGHT_MAP[size];

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      style={{ height, width: 'auto', display: 'inline-block' }}
      className={className}
      draggable={false}
    />
  );
}

export default Logo;
