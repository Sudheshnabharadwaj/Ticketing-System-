import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import {
  Ticket,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  Users,
  UserCheck,
  Building,
  Briefcase,
  KeyRound,
  BadgeAlert,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Send
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { registerUser, getCurrentSessionUser, UserRoleType } from '../../services/unifiedAuth';
import { supabase } from '../../services/supabaseClient';

interface PortalConfig {
  role: UserRoleType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ReactNode;
  activeTabClass: string;
  buttonClass: string;
  departments: string[];
}

const PORTAL_CONFIGS: Record<UserRoleType, PortalConfig> = {
  admin: {
    role: 'admin',
    title: 'Admin Portal Registration',
    badge: 'Enterprise Administrator',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'System governance, global ticket routing, and configuration workspace.',
    icon: <Shield className="w-4 h-4" />,
    activeTabClass: 'bg-sky-600 text-white shadow-sm border-sky-600',
    buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    departments: [
      'IT Operations',
      'Cloud Infrastructure',
      'Security Operations',
      'Global Enterprise IT',
      'Platform Architecture'
    ]
  },
  teamlead: {
    role: 'teamlead',
    title: 'Team Lead Portal Registration',
    badge: 'Team Lead & Queue Manager',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Department queue supervision, ticket dispatching, and SLA management.',
    icon: <Users className="w-4 h-4" />,
    activeTabClass: 'bg-amber-600 text-white shadow-sm border-amber-600',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    departments: [
      'IT Support',
      'Finance',
      'HR Operations',
      'Facilities',
      'General Administration',
      'Customer Success'
    ]
  },
  employee: {
    role: 'employee',
    title: 'Employee Portal Registration',
    badge: 'Employee Self-Service',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Submit support tickets, access knowledge base, and track requests.',
    icon: <UserCheck className="w-4 h-4" />,
    activeTabClass: 'bg-teal-600 text-white shadow-sm border-teal-600',
    buttonClass: 'bg-teal-600 hover:bg-teal-700 text-white',
    departments: [
      'IT Support',
      'Engineering',
      'Finance',
      'HR Operations',
      'Operations',
      'Sales & Marketing',
      'General Administration'
    ]
  }
};

interface SignupPageProps {
  defaultPortal?: UserRoleType;
}

export const SignupPage: React.FC<SignupPageProps> = ({ defaultPortal }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated and explicit redirect flag is provided, redirect to dashboard
  const currentUser = getCurrentSessionUser();
  if (currentUser && location.search.includes('redirect_authenticated=true')) {
    if (currentUser.role === 'teamlead') {
      return <Navigate to="/teamlead/dashboard" replace />;
    }
    if (currentUser.role === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Detect portal from prop, URL path, or search query parameter
  const determineInitialPortal = (): UserRoleType => {
    if (defaultPortal) return defaultPortal;
    const path = location.pathname.toLowerCase();
    const params = new URLSearchParams(location.search);
    const portalParam = params.get('portal')?.toLowerCase();

    if (portalParam === 'admin' || path.includes('/admin')) return 'admin';
    if (portalParam === 'teamlead' || path.includes('/teamlead')) return 'teamlead';
    if (portalParam === 'employee' || path.includes('/employee')) return 'employee';
    return 'admin';
  };

  const [activePortal, setActivePortal] = useState<UserRoleType>(determineInitialPortal);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState(PORTAL_CONFIGS[activePortal].departments[0]);
  const [phone, setPhone] = useState('');

  // Portal Specific Fields
  const [organization, setOrganization] = useState('');
  const [adminSecurityKey, setAdminSecurityKey] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Invitation & Email Verification State
  const [inviteToken, setInviteToken] = useState<string>('');
  const [isInviteVerified, setIsInviteVerified] = useState<boolean>(false);
  const [inviteVerificationStatus, setInviteVerificationStatus] = useState<string | null>(null);
  const [pendingInviteFound, setPendingInviteFound] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [resendingInvite, setResendingInvite] = useState<boolean>(false);
  const [resendStatusMsg, setResendStatusMsg] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [manualTokenError, setManualTokenError] = useState<string | null>(null);

  const checkEmailForPendingInvite = async (candidateEmail: string) => {
    if (!candidateEmail || !candidateEmail.includes('@') || isInviteVerified) return;
    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', candidateEmail.trim().toLowerCase())
        .maybeSingle();

      if (user && user.status === 'Pending Invitation') {
        setPendingInviteFound(true);
        setPendingUser(user);
        if (user.role && ['admin', 'teamlead', 'employee'].includes(user.role)) {
          setActivePortal(user.role as UserRoleType);
        }
        if (user.department) setDepartment(user.department);
        if (user.name && !fullName) setFullName(user.name);
      } else {
        setPendingInviteFound(false);
        setPendingUser(null);
      }
    } catch {}
  };

  const handleResendInvite = async () => {
    if (!email.trim()) return;
    setResendingInvite(true);
    setResendStatusMsg(null);
    try {
      const targetUser = pendingUser || await (async () => {
        const { data } = await supabase.from('users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle();
        return data;
      })();

      if (!targetUser) {
        setResendStatusMsg('No pending account found for this email.');
        return;
      }

      const token = targetUser.invite_token || `inv-${Math.random().toString(36).substring(2, 10)}`;
      if (!targetUser.invite_token) {
        await supabase.from('users').update({ invite_token: token }).eq('email', targetUser.email);
      }

      const roleNorm = (targetUser.role || activePortal).toLowerCase().replace(' ', '');
      const signupUrl = `${window.location.origin}/signup?token=${token}&email=${encodeURIComponent(targetUser.email)}&role=${roleNorm}`;

      const resp = await fetch('http://localhost:8000/api/v1/notifications/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetUser.name || fullName || 'User',
          email: targetUser.email,
          employee_id: targetUser.id || '',
          role: targetUser.role || activePortal,
          department: targetUser.department || department,
          invite_token: token,
          signup_url: signupUrl,
          password: targetUser.password || 'Password123'
        })
      });

      const resData = await resp.json();
      if (resData.smtp_sent) {
        setResendStatusMsg(`✓ Live email dispatched to ${targetUser.email}! Check your inbox.`);
      } else {
        setResendStatusMsg(`✓ Verification ready! Verification token: ${token}`);
        setManualTokenInput(token);
      }
    } catch {
      setResendStatusMsg('Could not contact notification server. Make sure backend is running.');
    } finally {
      setResendingInvite(false);
    }
  };

  const handleQuickVerifyPending = () => {
    if (!pendingUser?.invite_token) return;
    setManualTokenInput(pendingUser.invite_token);
    setIsInviteVerified(true);
    setInviteToken(pendingUser.invite_token);
    if (pendingUser.name) setFullName(pendingUser.name);
    if (pendingUser.role && ['admin', 'teamlead', 'employee'].includes(pendingUser.role)) {
      setActivePortal(pendingUser.role as UserRoleType);
    }
    if (pendingUser.department) setDepartment(pendingUser.department);
    setInviteVerificationStatus(`✓ Email Verified: Pre-authorized access confirmed for ${pendingUser.email} as ${pendingUser.role?.toUpperCase()}. Create your password below to activate your account.`);
    setPendingInviteFound(false);
  };

  const handleVerifyManualToken = async () => {
    if (!manualTokenInput.trim() || !email.trim()) {
      setManualTokenError('Please enter your verification token.');
      return;
    }
    setManualTokenError(null);
    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (!user) {
        setManualTokenError('No user found for this email address.');
        return;
      }
      if (user.status === 'Active') {
        setInviteVerificationStatus('This account is already active. Please sign in directly.');
        return;
      }
      if (user.invite_token === manualTokenInput.trim()) {
        setIsInviteVerified(true);
        setInviteToken(manualTokenInput.trim());
        if (user.name) setFullName(user.name);
        if (user.role && ['admin', 'teamlead', 'employee'].includes(user.role)) {
          setActivePortal(user.role as UserRoleType);
        }
        if (user.department) setDepartment(user.department);
        setInviteVerificationStatus(`✓ Email Verified: Access verified for ${user.email} as ${user.role?.toUpperCase()}. Please create your password below to activate your account.`);
        setPendingInviteFound(false);
      } else {
        setManualTokenError('Invalid verification token. Please verify the code received in your invitation email.');
      }
    } catch {
      setManualTokenError('Verification failed. Please check connection and try again.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const emailParam = params.get('email');
    const roleParam = params.get('role')?.toLowerCase() as UserRoleType | null;

    if (emailParam) {
      setEmail(emailParam);
    }
    if (token) {
      setInviteToken(token);
    }
    if (roleParam && ['admin', 'teamlead', 'employee'].includes(roleParam)) {
      setActivePortal(roleParam);
    } else {
      setActivePortal(determineInitialPortal());
    }

    if (token && emailParam) {
      supabase
        .from('users')
        .select('*')
        .eq('email', emailParam.trim().toLowerCase())
        .maybeSingle()
        .then(({ data: user }) => {
          if (user) {
            if (user.status === 'Active') {
              setInviteVerificationStatus('This account is already verified and active. Please sign in directly.');
            } else if (user.invite_token === token || !user.invite_token) {
              setIsInviteVerified(true);
              setFullName(user.name || '');
              if (user.role && ['admin', 'teamlead', 'employee'].includes(user.role)) {
                setActivePortal(user.role as UserRoleType);
              }
              if (user.department) {
                setDepartment(user.department);
              }
              setInviteVerificationStatus(`✓ Email Verified: Access granted by Administrator as ${user.role?.toUpperCase()}. Create your password to activate your account.`);
            } else {
              setInviteVerificationStatus('Invalid invitation verification token. Please verify your link or contact administrator.');
            }
          }
        });
    }
  }, [location.pathname, location.search]);

  // Switch Portal and update defaults
  const handlePortalSwitch = (portal: UserRoleType) => {
    if (isInviteVerified) return; // Locked to verified role
    setActivePortal(portal);
    setDepartment(PORTAL_CONFIGS[portal].departments[0]);
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string | undefined> = {};
    setServerError(null);

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role specific validations
    if (!isInviteVerified) {
      if (activePortal === 'admin' && !organization.trim()) {
        newErrors.organization = 'Organization or company name is required';
      }

      if (activePortal === 'teamlead' && !teamName.trim()) {
        newErrors.teamName = 'Team name / unit is required';
      }

      if (activePortal === 'employee' && !employeeId.trim()) {
        newErrors.employeeId = 'Employee ID is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      const result = await registerUser({
        name: fullName,
        email,
        phone,
        department,
        role: activePortal,
        password,
        organization,
        teamName,
        leadId: leadId || `TL-${Math.floor(1000 + Math.random() * 9000)}`,
        employeeId: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        jobTitle: jobTitle || 'Team Member',
        inviteToken: inviteToken || undefined,
      });

      setIsSubmitting(false);

      if (!result.success || !result.user) {
        setServerError(result.error || 'Failed to create account. Please try again.');
        return;
      }

      const createdUser = result.user;
      setSuccessMessage(`Account created successfully for ${createdUser.name}! Redirecting to Login...`);

      setTimeout(() => {
        // Enforce required flow: Sign Up -> Login -> Dashboard
        // Redirect to Login page with registered email pre-filled and a success banner
        navigate('/login', {
          replace: true,
          state: {
            registeredEmail: createdUser.email,
            registrationSuccess: `Account created successfully for ${createdUser.name}! Please sign in with your credentials.`
          }
        });
      }, 700);
    }, 400);
  };

  const currentConfig = PORTAL_CONFIGS[activePortal];

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
                Unified Portal Registration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => handlePortalSwitch('admin')}
              className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activePortal === 'admin'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin Portal
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('teamlead')}
              className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activePortal === 'teamlead'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Team Lead Portal
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('employee')}
              className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activePortal === 'employee'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Employee Portal
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
            <Ticket className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select your designated portal below to configure your workspace credentials.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          {/* Portal Switch Tabs */}
          <div className="mb-6">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Portal Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handlePortalSwitch('admin')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePortal === 'admin'
                    ? PORTAL_CONFIGS.admin.activeTabClass
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handlePortalSwitch('teamlead')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePortal === 'teamlead'
                    ? PORTAL_CONFIGS.teamlead.activeTabClass
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Lead</span>
              </button>
              <button
                type="button"
                onClick={() => handlePortalSwitch('employee')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePortal === 'employee'
                    ? PORTAL_CONFIGS.employee.activeTabClass
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Employee</span>
              </button>
            </div>
          </div>

          {/* Active Portal Header Banner */}
          <div className="mb-6 p-3.5 rounded-xl border bg-slate-50 border-slate-200 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 text-slate-700">
              {currentConfig.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">{currentConfig.title}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${currentConfig.badgeColor}`}>
                  {currentConfig.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {currentConfig.description}
              </p>
            </div>
          </div>

          {/* Verified Invitation Banner */}
          {inviteVerificationStatus && (
            <div className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold shadow-xs ${
              isInviteVerified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${isInviteVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="flex-1 leading-relaxed">{inviteVerificationStatus}</div>
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
              <BadgeAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Common: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                }}
                error={errors.fullName}
                icon={<UserIcon className="w-4 h-4" />}
              />

              <Input
                label="Work Email *"
                type="email"
                placeholder="alex.m@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                onBlur={() => checkEmailForPendingInvite(email)}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
              />
            </div>

            {pendingInviteFound && !isInviteVerified && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Mail className="w-4 h-4 text-amber-600" />
                    Invitation Email Verification Required
                  </div>
                  {pendingUser?.invite_token && (
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                      Token: {pendingUser.invite_token}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  Access for <strong>{email}</strong> has been pre-authorized by an Administrator or Team Lead. Enter your verification token below, or click Auto-Verify to activate your account immediately:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      placeholder="Enter verification token (e.g. inv-...)"
                      value={manualTokenInput}
                      onChange={(e) => {
                        setManualTokenInput(e.target.value);
                        if (manualTokenError) setManualTokenError(null);
                      }}
                      className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyManualToken}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Verify Token
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {pendingUser?.invite_token && (
                      <button
                        type="button"
                        onClick={handleQuickVerifyPending}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                        title="Auto-fill token and verify immediately"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Auto-Verify
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={resendingInvite}
                      onClick={handleResendInvite}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      title="Resend verification email"
                    >
                      <Send className="w-3.5 h-3.5" /> {resendingInvite ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                </div>
                {resendStatusMsg && (
                  <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 rounded p-1.5 font-medium">
                    {resendStatusMsg}
                  </p>
                )}
                {manualTokenError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{manualTokenError}</p>
                )}
              </div>
            )}

            {/* Department Selection */}
            <div className="w-full flex flex-col gap-1 text-left">
              <label className="text-xs font-semibold text-slate-700">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 shadow-2xs"
              >
                {currentConfig.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Portal-Specific Fields */}
            {activePortal === 'admin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Organization / Company Name *"
                  placeholder="e.g. Global Tech Solutions"
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value);
                    if (errors.organization) setErrors({ ...errors, organization: undefined });
                  }}
                  error={errors.organization}
                  icon={<Building className="w-4 h-4" />}
                />

                <Input
                  label="Security Master Code"
                  placeholder="e.g. ADMIN-2026 (Optional)"
                  value={adminSecurityKey}
                  onChange={(e) => setAdminSecurityKey(e.target.value)}
                  helperText="Default: auto-approved for platform setup"
                  icon={<KeyRound className="w-4 h-4" />}
                />
              </div>
            )}

            {activePortal === 'teamlead' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Team / Pod Name *"
                  placeholder="e.g. IT Incident Resolution Pod"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (errors.teamName) setErrors({ ...errors, teamName: undefined });
                  }}
                  error={errors.teamName}
                  icon={<Users className="w-4 h-4" />}
                />

                <Input
                  label="Lead ID Number"
                  placeholder="e.g. TL-4091"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  helperText="Leave empty to auto-generate"
                  icon={<Briefcase className="w-4 h-4" />}
                />
              </div>
            )}

            {activePortal === 'employee' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Employee ID *"
                  placeholder="e.g. EMP-9182"
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    if (errors.employeeId) setErrors({ ...errors, employeeId: undefined });
                  }}
                  error={errors.employeeId}
                  icon={<UserCheck className="w-4 h-4" />}
                />

                <Input
                  label="Job Title"
                  placeholder="e.g. Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  icon={<Briefcase className="w-4 h-4" />}
                />
              </div>
            )}

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Input
                label="Password *"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm Password *"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                error={errors.confirmPassword}
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                className={`w-full justify-center py-2.5 font-semibold text-sm shadow-sm transition-all ${currentConfig.buttonClass}`}
                disabled={isSubmitting}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isSubmitting
                  ? 'Provisioning Account...'
                  : `Sign Up for ${currentConfig.badge}`}
              </Button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0284C7] font-semibold hover:underline">
                Sign in to your Workspace
              </Link>
            </p>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Role-Based Access Control • 256-bit TLS enterprise security</span>
        </div>
      </div>
    </div>
  </div>
  );
};
