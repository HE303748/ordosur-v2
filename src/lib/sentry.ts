import * as Sentry from '@sentry/react';
import type { ErrorInfo } from 'react';

let _initialized = false;

function stripQuery(url: string): string {
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  const i = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  return i === -1 ? url : url.slice(0, i);
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
        if (event.request.url) {
          event.request.url = stripQuery(event.request.url);
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null;
      if (breadcrumb.category === 'ui.click' || breadcrumb.category === 'ui.input') {
        breadcrumb.message = '[redacted]';
        delete breadcrumb.data;
        return breadcrumb;
      }
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        const d = breadcrumb.data as Record<string, unknown> | undefined;
        breadcrumb.data = {
          ...(d?.method !== undefined && { method: d.method }),
          ...(d?.status_code !== undefined && { status_code: d.status_code }),
          ...(typeof d?.url === 'string' && { url: stripQuery(d.url) }),
        };
        return breadcrumb;
      }
      if (breadcrumb.category === 'navigation') {
        const d = breadcrumb.data as Record<string, unknown> | undefined;
        if (d) {
          if (typeof d.from === 'string') d.from = stripQuery(d.from);
          if (typeof d.to === 'string') d.to = stripQuery(d.to);
        }
        return breadcrumb;
      }
      return breadcrumb;
    },
  });
  _initialized = true;
}

export function captureError(error: Error, errorInfo?: ErrorInfo): void {
  if (!_initialized) return;
  Sentry.captureException(error, {
    contexts: { react: { componentStack: errorInfo?.componentStack ?? null } },
  });
}
