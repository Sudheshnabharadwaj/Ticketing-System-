import React from 'react';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
  strength: 'Weak' | 'Medium' | 'Strong';
  score: number;
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteria = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar];
  const score = criteria.filter(Boolean).length;

  let strength: 'Weak' | 'Medium' | 'Strong' = 'Weak';
  if (score >= 5) {
    strength = 'Strong';
  } else if (score >= 3) {
    strength = 'Medium';
  }

  const isValid = score === 5;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid,
    strength,
    score,
  };
}

interface PasswordStrengthValidatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthValidator: React.FC<PasswordStrengthValidatorProps> = ({
  password,
  showRequirements = true,
}) => {
  if (!password) return null;

  const result = validatePassword(password);

  const getStrengthBadgeColor = () => {
    switch (result.strength) {
      case 'Strong':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getBarColor = (index: number) => {
    if (index >= result.score) return 'bg-slate-200';
    if (result.strength === 'Strong') return 'bg-emerald-500';
    if (result.strength === 'Medium') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2 mt-2 font-sans">
      {/* Strength Bar & Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${getBarColor(i)}`}
            />
          ))}
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider flex items-center gap-1 ${getStrengthBadgeColor()}`}
        >
          {result.isValid ? (
            <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
          ) : (
            <ShieldAlert className="w-3 h-3 inline" />
          )}
          {result.strength}
        </span>
      </div>

      {/* Criteria Checklist */}
      {showRequirements && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
          <div className="font-bold text-slate-700 mb-1">Password Requirements:</div>
          <RequirementItem label="Minimum 8 characters" met={result.hasMinLength} />
          <RequirementItem label="At least 1 uppercase letter (A-Z)" met={result.hasUppercase} />
          <RequirementItem label="At least 1 lowercase letter (a-z)" met={result.hasLowercase} />
          <RequirementItem label="At least 1 number (0-9)" met={result.hasNumber} />
          <RequirementItem label="At least 1 special character (!@#$%^&*...)" met={result.hasSpecialChar} />
        </div>
      )}
    </div>
  );
};

const RequirementItem: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
  <div className={`flex items-center gap-2 text-[11.5px] ${met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
    {met ? (
      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 stroke-[3]" />
      </div>
    ) : (
      <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
        <X className="w-2.5 h-2.5 stroke-[3]" />
      </div>
    )}
    <span>{label}</span>
  </div>
);
