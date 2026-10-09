import { type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sprint P — Entrée de vue en CSS pur (150 ms), sans animation de sortie.
 * Avant : framer-motion + <AnimatePresence mode="wait"> ne montait la nouvelle vue qu'une
 * fois l'animation de sortie de l'ancienne TERMINÉE. Quand le navigateur ralentit les
 * animations (onglet en arrière-plan, machine chargée, pilotage automatisé), l'ancienne
 * page restait affichée en grisé — et cliquable — pendant plusieurs secondes.
 * Désormais la nouvelle vue remplace l'ancienne dans le même rendu.
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return <div className={`view-enter ${className}`}>{children}</div>;
}
