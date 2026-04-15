export interface PasswordStrength {
  score: number;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  feedback: string;
}

/*
 * SECURITY: Password validation enforces strong password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 *
 * Combined with Supabase's "Leaked Password Protection" (HaveIBeenPwned),
 * this provides comprehensive password security.
 */
export function validatePassword(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const conditions = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  ];

  const score = conditions.filter(Boolean).length;

  let feedback = '';
  if (score < 3) {
    feedback = 'Mot de passe faible';
  } else if (score < 5) {
    feedback = 'Mot de passe moyen';
  } else {
    feedback = 'Mot de passe fort';
  }

  return {
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    feedback,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  // Accepte le format marocain : +212 6XX XXX XXX ou 06XXXXXXXX / 07XXXXXXXX
  const normalized = phone.replace(/[\s\-\.]/g, '');
  const moroccanRegex = /^(\+212[5-9]\d{8}|0[5-9]\d{8})$/;
  return moroccanRegex.test(normalized);
}

export function validateRPPSNumber(rpps: string): boolean {
  const rppsRegex = /^\d{11}$/;
  return rppsRegex.test(rpps);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '');
}

export function sanitizeInputFinal(input: string): string {
  return input.trim().replace(/[<>]/g, '').replace(/\s+/g, ' ');
}

export function validateFullName(name: string): boolean {
  const sanitized = sanitizeInputFinal(name);
  const words = sanitized.split(' ').filter(Boolean);
  return words.length >= 2 && sanitized.length >= 3 && sanitized.length <= 100;
}
