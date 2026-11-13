import React, { useState } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { Ticket, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { loginBackend } from '../services/backendAuth';
import { EmployeeService } from '../services/employeeService';
import kivoLogo from '../assets/kivo-logo.png';

export const EmployeeSignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated with valid tokens, redirect to Dashboard
  try {
    const explicitlyLoggedOut =
      sessionStorage.getItem('platform_explicitly_logged_out') === 'true' ||
      localStorage.getItem('platform_explicitly_logged_out') === 'true';
    if (!explicitlyLoggedOut) {
      const raw = sessionStorage.getItem('platform_current_user') || localStorage.getItem('platform_current_user');
      const hasToken =
        !!localStorage.getItem('backend_auth_token') ||
        !!sessionStorage.getItem('backend_auth_token') ||
        !!localStorage.getItem('backend_refresh_token') ||
        !!sessionStorage.getItem('backend_refresh_token');
      if (raw && hasToken) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) {
          return <Navigate to="/dashboard" replace />;
        }
      }
    }
  } catch {}

  const stateData = location.state as { registeredEmail?: string; registrationSuccess?: string } | null;
  const queryEmail = new URLSearchParams(location.search).get('email') || '';
  const [email, setEmail] = useState(stateData?.registeredEmail || queryEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(stateData?.registrationSuccess || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await loginBackend(cleanEmail, password);
      if (!res.ok) {
        setErrors({ auth: res.error || 'Invalid credentials. Please verify your email and password.' });
        return;
      }

      const dbUser = res.user;
      const userSession = {
        id: dbUser.id,
        name: dbUser.name || cleanEmail.split('@')[0],
        email: dbUser.email,
        department: dbUser.department || 'Operations',
        role: dbUser.role || 'employee',
        status: dbUser.status || 'Active',
        avatar: dbUser.avatar || null,
      };
      sessionStorage.setItem('platform_current_user', JSON.stringify(userSession));
      localStorage.setItem('platform_current_user', JSON.stringify(userSession));
      sessionStorage.removeItem('platform_explicitly_logged_out');
      localStorage.removeItem('platform_explicitly_logged_out');
      EmployeeService.clearCache();
      if (dbUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (dbUser.role === 'teamlead') {
        navigate('/teamlead/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      setErrors({ auth: 'Unable to connect to authentication service. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="h-16 w-48 flex items-center justify-center mx-auto mb-2">
          <img src={kivoLogo} alt="KIVO" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          KIVO
        </h2>
        <p className="text-xs text-slate-500">
          Employee Portal Sign In
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
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
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

          {/* Account Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Employee accounts are provisioned by your organization administrator.
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
