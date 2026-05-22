/**
 * Configuration partagée de l'application.
 *
 * PUBLIC_URL : URL canonique du site, utilisée pour construire les liens partagés
 * (emails de reset password, callbacks Supabase, liens d'invitation, etc.).
 *
 * Pourquoi ne pas utiliser window.location.origin :
 *   - Quand l'utilisateur charge l'app via www.ordosur.com (lien externe, bookmark,
 *     redirect DNS pas encore propagé), window.location.origin renvoie
 *     "https://www.ordosur.com" et le www se propage dans les liens partagés.
 *   - Quand l'app est servie sur un preview Vercel (ordosur-v2.vercel.app),
 *     les liens email partiraient vers ce domaine éphémère.
 *
 * On hardcode donc l'URL de production avec un override possible via
 * import.meta.env.VITE_PUBLIC_URL (utile en dev/staging).
 */
export const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://ordosur.com';
