/**
 * Retourne l'âge en mois entiers à partir de la date de naissance.
 * Retourne null si la date est absente, invalide ou dans le futur.
 */
export function getAgeEnMois(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  if (now < dob) return null;
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth()) -
    (now.getDate() < dob.getDate() ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Formate l'âge d'un patient à partir de sa date de naissance.
 * < 31 jours → "X jours" | < 24 mois → "X mois" | sinon → "X ans"
 * Retourne null si la date est absente ou invalide.
 */
export function formatAge(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - dob.getTime();
  if (diffMs < 0) return null;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 31) {
    return diffDays <= 1 ? '1 jour' : `${diffDays} jours`;
  }

  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth()) -
    (now.getDate() < dob.getDate() ? 1 : 0);
  if (months < 24) {
    return months <= 1 ? '1 mois' : `${months} mois`;
  }

  let years = now.getFullYear() - dob.getFullYear();
  if (
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  ) years--;
  return years <= 1 ? '1 an' : `${years} ans`;
}
