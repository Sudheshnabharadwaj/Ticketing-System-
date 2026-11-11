import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Ticket, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const result = await loginUser(email, password);

      if (!result.success || !result.user) {
        setErrors({ auth: result.error || 'Invalid credentials. Please verify your email and password.' });
        return;
      }

      // Dynamic routing to appropriate dashboard based on user role
      if (result.user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (result.user.role === 'teamlead') {
        navigate('/teamlead/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrors({ auth: err?.message || 'Login failed. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
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
            Enter your credentials to access your portal dashboard.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
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
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.auth) setErrors({ ...errors, password: undefined, auth: undefined });
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
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
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Account Provisioning Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Team Lead and Employee accounts are provisioned by your system administrator.
            </p>
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
