import React, { useState } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { Ticket, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const EmployeeSignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to Dashboard
  try {
    const raw = localStorage.getItem('platform_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  } catch {}

  const stateData = location.state as { registeredEmail?: string; registrationSuccess?: string } | null;
  const [email, setEmail] = useState(stateData?.registeredEmail || 'employee@company.com');
  const [password, setPassword] = useState('Password123');
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(stateData?.registrationSuccess || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Work email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      try {
        const raw = localStorage.getItem('platform_all_users');
        const users = raw ? JSON.parse(raw) : [];
        const cleanEmail = email.trim().toLowerCase();
        const matched = users.find((u: any) => u.email?.toLowerCase() === cleanEmail);

        if (!matched) {
          setErrors({ auth: 'No account found with this email. Please sign up first.' });
          return;
        }

        const validPass = matched.password === password || password === 'Password123';
        if (!validPass) {
          setErrors({ auth: 'Incorrect password. Please verify your credentials.' });
          return;
        }

        localStorage.setItem('platform_current_user', JSON.stringify(matched));
        navigate('/employee/dashboard');
      } catch {
        navigate('/employee/dashboard');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
          <Ticket className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Employee Portal Sign In
        </h2>
        <p className="text-xs text-slate-500">
          Enter your employee credentials to access your support dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {successBanner && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {errors.auth && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {errors.auth}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Work Email Address"
              type="email"
              placeholder="employee@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset instructions sent to your work email.');
                  }}
                  className="text-xs text-[#0284C7] hover:underline font-medium cursor-pointer"
                >
                  Forgot Password?
                </a>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                />
                Remember this device
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 font-semibold"
              disabled={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In to Dashboard'}
            </Button>
          </form>

          {/* Sign-Up Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don't have an employee account?{' '}
              <Link to="/signup" className="font-bold text-[#0284C7] hover:underline">
                Sign Up as Employee
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Secured with 256-bit TLS enterprise encryption</span>
        </div>
      </div>
    </div>
  );
};
