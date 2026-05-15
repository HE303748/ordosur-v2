/**
 * OrdoSur Design Tokens — v1
 * Source of truth for the brand palette and typography.
 * These values mirror tailwind.config.js and the CSS custom properties in index.css.
 *
 * Usage:
 *   import { colors, fonts } from '@/lib/design-tokens';
 *   const bg = colors['ink-navy'];
 */

export const colors = {
  // ── Text / Dark backgrounds ──────────────────────────────────────────────
  'ink-navy':      '#0A1628', // primary text, logo seal, dark backgrounds
  'ink-navy-soft': '#1A2B42', // softer dark bg (sidebar, cards in dark mode)
  'ink-muted':     '#475569', // secondary text, labels
  'ink-faint':     '#94A3B8', // placeholder text, disabled states

  // ── Brand accent ─────────────────────────────────────────────────────────
  'medical-green':      '#00A86B', // accent, checkmark, validation, "sur" in logo
  'medical-green-soft': '#E6F4EE', // light tint for badges, backgrounds
  'medical-green-deep': '#006B47', // hover state, pressed, dark variant

  // ── Backgrounds ──────────────────────────────────────────────────────────
  'paper':      '#FAFAF7', // main background (warmer than pure white)
  'paper-pure': '#FFFFFF', // cards, modals on paper background

  // ── Alerts ───────────────────────────────────────────────────────────────
  'alert-red':      '#DC2626', // errors, critical interactions — reserved
  'alert-red-soft': '#FEF2F2', // light tint for alert backgrounds

  // ── Structural ───────────────────────────────────────────────────────────
  'divider': '#E5E5E0', // borders, separators, table lines
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
} as const;

export type FontToken = keyof typeof fonts;

/** Semantic aliases for common use-cases */
export const semantic = {
  background:       colors['paper'],
  backgroundDark:   colors['ink-navy'],
  text:             colors['ink-navy'],
  textMuted:        colors['ink-muted'],
  textFaint:        colors['ink-faint'],
  accent:           colors['medical-green'],
  accentSoft:       colors['medical-green-soft'],
  accentDeep:       colors['medical-green-deep'],
  danger:           colors['alert-red'],
  dangerSoft:       colors['alert-red-soft'],
  border:           colors['divider'],
} as const;
