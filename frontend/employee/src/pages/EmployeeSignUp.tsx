import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Ticket, Mail, Lock, User, Briefcase, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { supabase } from '../services/supabaseClient';

export const EmployeeSignUp: React.FC = () => {
  const navigate = useNavigate();

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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [jobTitle, setJobTitle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string | undefined> = {};

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!email.trim()) {
      newErrors.email = 'Corporate email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid corporate email';
    }

    if (!employeeId.trim()) newErrors.employeeId = 'Employee ID is required';

    if (!password) {
      newErrors.password = 'Password is required';
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
      // 1. Check if user already exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        setErrors({ email: 'An account with this email address already exists. Please sign in instead.' });
        setIsSubmitting(false);
        return;
      }

      // 2. Direct insert into Supabase users table
      const newUserId = `usr-emp-${Date.now()}`;
      const { error: insErr } = await supabase
        .from('users')
        .insert([{
          id: newUserId,
          name: fullName.trim(),
          email: cleanEmail,
          department,
          designation: jobTitle || 'Team Member',
          role: 'employee',
          password,
          status: 'Active',
        }]);

      if (insErr) {
        console.error('Supabase user registration error:', insErr);
        setErrors({ email: `Registration error: ${insErr.message}` });
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      navigate('/signin', {
        replace: true,
        state: {
          registeredEmail: cleanEmail,
          registrationSuccess: `Account created successfully for ${fullName.trim()}! Please sign in with your credentials.`
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrors({ email: 'Unable to connect to database. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <UserCheck className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Employee Portal Sign Up
        </h2>
        <p className="text-xs text-slate-500">
          Register your employee account to submit tickets and access support services.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Full Name *"
              placeholder="e.g. Sudha Bharadwaj"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors({ ...errors, fullName: undefined });
              }}
              error={errors.fullName}
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="Corporate Email Address *"
              type="email"
              placeholder="sudha@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Employee ID *"
                placeholder="e.g. EMP-1049"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (errors.employeeId) setErrors({ ...errors, employeeId: undefined });
                }}
                error={errors.employeeId}
                icon={<Briefcase className="w-4 h-4" />}
              />

              <div className="w-full flex flex-col gap-1 text-left">
                <label className="text-xs font-semibold text-slate-700">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 shadow-2xs"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="IT Support">IT Support</option>
                  <option value="Finance">Finance</option>
                  <option value="HR Operations">HR Operations</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>
            </div>

            <Input
              label="Job Title"
              placeholder="e.g. Software Engineer (Optional)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              icon={<Briefcase className="w-4 h-4" />}
            />

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

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 font-semibold bg-teal-600 hover:bg-teal-700 text-white mt-2"
              disabled={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isSubmitting ? 'Creating Employee Account...' : 'Create Employee Account'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an employee account?{' '}
              <Link to="/signin" className="font-semibold text-teal-600 hover:underline">
                Sign in to Employee Portal
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Employee Self-Service Portal • Secured 256-bit TLS</span>
        </div>
      </div>
    </div>
  );
};
