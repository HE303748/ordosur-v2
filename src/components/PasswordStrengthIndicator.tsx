import { Check, X } from 'lucide-react';
import { PasswordStrength } from '../lib/validation';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  password: string;
}

export function PasswordStrengthIndicator({ strength, password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const getColorClass = () => {
    if (strength.score < 3) return 'bg-red-500';
    if (strength.score < 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorClass = () => {
    if (strength.score < 3) return 'text-red-600';
    if (strength.score < 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getColorClass()}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${getTextColorClass()}`}>
          {strength.feedback}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <RequirementItem
          met={strength.hasMinLength}
          text="8 caractères minimum"
        />
        <RequirementItem
          met={strength.hasUppercase}
          text="Une majuscule"
        />
        <RequirementItem
          met={strength.hasLowercase}
          text="Une minuscule"
        />
        <RequirementItem
          met={strength.hasNumber}
          text="Un chiffre"
        />
        <RequirementItem
          met={strength.hasSpecialChar}
          text="Un caractère spécial"
        />
      </div>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center space-x-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      <span>{text}</span>
    </div>
  );
}
