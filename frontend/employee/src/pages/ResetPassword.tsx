import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabaseClient';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(queryParams.get('email') || '');
  const [code, setCode] = useState(queryParams.get('code') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Registered email is required';
    }

    if (!code.trim()) {
      newErrors.code = '6-digit verification code is required';
    }

    if (!password) {
      newErrors.password = 'New Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: dbUser, error: findErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (findErr || !dbUser) {
        setErrors({ email: 'No account found with this email address.' });
        setIsSubmitting(false);
        return;
      }

      // Verify reset code
      if (dbUser.invite_token && dbUser.invite_token.startsWith('reset-')) {
        const expectedCode = dbUser.invite_token.replace('reset-', '');
        if (code.trim() !== expectedCode) {
          setErrors({ code: 'Invalid verification code. Please check your email.' });
          setIsSubmitting(false);
          return;
        }
      }

      const { error: updErr } = await supabase
        .from('users')
        .update({
          password: password,
          invite_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', cleanEmail);

      if (updErr) {
        setErrors({ general: 'Failed to update password. Please try again.' });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrors({ general: 'Error processing password reset.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
          <Ticket className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Reset Employee Password
        </h2>
        <p className="text-xs text-slate-500">
          Enter your verification code and set a new password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Password Reset Complete!</h3>
              <p className="text-xs text-slate-600">
                Your employee password has been updated in the database.
              </p>
              <Button
                variant="primary"
                className="w-full justify-center py-2.5 font-semibold mt-2"
                onClick={() => navigate('/signin')}
              >
                Sign In With New Password
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {errors.general}
                </div>
              )}

              <Input
                label="Registered Work Email *"
                type="email"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                error={errors.email}
              />

              <Input
                label="Verification Code (from email) *"
                type="text"
                placeholder="6-digit code e.g. 123456"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                }}
                error={errors.code}
              />

              <Input
                label="New Password *"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm New Password *"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                error={errors.confirmPassword}
                icon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-2.5 font-semibold mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link to="/signin" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
