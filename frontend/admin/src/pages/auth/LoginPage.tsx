import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Ticket, Mail, Lock, ArrowRight, ShieldCheck, UserCheck, Users, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { loginUser, getCurrentSessionUser } from '../../services/unifiedAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect directly to user's dashboard
  const currentUser = getCurrentSessionUser();
  if (currentUser) {
    if (currentUser.role === 'teamlead') {
      return <Navigate to="/teamlead/dashboard" replace />;
    }
    if (currentUser.role === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  const stateData = location.state as { registeredEmail?: string; registrationSuccess?: string } | null;
  const [email, setEmail] = useState(stateData?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(
    stateData?.registrationSuccess || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123');
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
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
    setTimeout(async () => {
      const result = await loginUser(email, password);
      setIsSubmitting(false);

      if (!result.success || !result.user) {
        setErrors({ auth: result.error || 'Invalid credentials. Please verify your email and password.' });
        return;
      }

      // Dynamic routing to appropriate dashboard based on user role
      if (result.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (result.user.role === 'teamlead') {
        navigate('/teamlead/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <header className="w-full bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0284C7] flex items-center justify-center text-white shadow-xs">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight block leading-none">
                Enterprise ITSM Platform
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Unified Portal Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white shadow-xs"
            >
              Sign In
            </Link>
            <Link
              to="/admin/signup"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Sign-Up
            </Link>
            <Link
              to="/teamlead/signup"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> Team Lead Sign-Up
            </Link>
            <Link
              to="/employee/signup"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Employee Sign-Up
            </Link>
            <Link
              to="/signup"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0284C7] text-white hover:bg-[#0369a1] shadow-xs"
            >
              All Sign-Up Pages &rarr;
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Workspace
          </h2>
          <p className="text-xs text-slate-500">
            Access your portal dashboard or choose a portal below to sign up.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
            {/* Primary Mode Toggle: Sign In vs Sign Up */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 mb-5">
              <button
                type="button"
                className="py-2 text-xs font-bold rounded-md bg-white text-slate-900 shadow-xs border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-sky-600" />
                Sign In
              </button>
              <Link
                to="/signup"
                className="py-2 text-xs font-semibold rounded-md text-slate-600 hover:text-slate-900 hover:bg-white/60 flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                Sign Up / Register
              </Link>
            </div>

            {/* Direct Portal Sign-Up Links Banner */}
            <div className="mb-5 p-3 rounded-lg bg-sky-50/60 border border-sky-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Need an Account? Sign Up:
                </span>
                <Link to="/signup" className="text-[11px] font-bold text-sky-600 hover:underline">
                  View All &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Link
                  to="/admin/signup"
                  className="py-1.5 px-2 text-center rounded bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 flex flex-col items-center justify-center gap-1 shadow-2xs"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Admin</span>
                </Link>
                <Link
                  to="/teamlead/signup"
                  className="py-1.5 px-2 text-center rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 flex flex-col items-center justify-center gap-1 shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Team Lead</span>
                </Link>
                <Link
                  to="/employee/signup"
                  className="py-1.5 px-2 text-center rounded bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 flex flex-col items-center justify-center gap-1 shadow-2xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Employee</span>
                </Link>
              </div>
            </div>

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
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (successBanner) setSuccessBanner(null);
                if (errors.email || errors.auth) setErrors({ ...errors, email: undefined, auth: undefined });
              }}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/admin/auth/forgot-password"
                  className="text-xs text-[#0284C7] hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.auth) setErrors({ ...errors, password: undefined, auth: undefined });
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
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Portal Sign-Up Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              New to the platform? Sign up for your portal:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Link
                to="/admin/auth/signup"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
              >
                Admin Sign-Up
              </Link>
              <Link
                to="/teamlead/auth/signup"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                Team Lead Sign-Up
              </Link>
              <Link
                to="/employee/auth/signup"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                Employee Sign-Up
              </Link>
            </div>
            <div className="pt-0.5">
              <Link
                to="/signup"
                className="text-xs font-semibold text-[#0284C7] hover:underline"
              >
                Multi-Portal Registration &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Secured with 256-bit TLS enterprise encryption</span>
        </div>
      </div>
    </div>
  </div>
  );
};
