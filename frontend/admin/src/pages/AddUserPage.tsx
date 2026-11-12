import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PasswordStrengthValidator, validatePassword } from '../components/ui/PasswordStrengthValidator';
import type { UserRole, UserDepartment } from '../types';
import { AdminApiService } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { OrganizationService } from '../services/organizationService';
import { apiRequestSafe } from '../services/backendAuth';
import {
  UserPlus,
  Mail,
  Phone,
  Key,
  Copy,
  Check,
  UserCheck,
  ArrowLeft,
  Info,
  BadgeCheck,
  Building2
} from 'lucide-react';

export const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '' as string,
    customDepartment: '',
    role: '' as string,
    teamLead: '',
    password: '',
    confirmPassword: '',
    userDetails: '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [teamLeadsFromDb, setTeamLeadsFromDb] = useState<{ id: string; name: string; department: string; email: string }[]>(() =>
    OrganizationService.getAllTeamLeads().map((tl) => ({
      id: tl.id || tl.employeeId,
      name: tl.name,
      department: tl.departmentName || 'IT Support',
      email: tl.email || '',
    }))
  );

  const [createdUserSummary, setCreatedUserSummary] = useState<{
    employeeId: string;
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
    loginUrl: string;
  } | null>(null);

  // Fetch actual Team Leads with instant Supabase fallback
  useEffect(() => {
    let cancelled = false;
    const fetchTeamLeads = async () => {
      // 1. Direct Supabase query (instant)
      try {
        const { data: supaLeads, error: supaErr } = await supabase
          .from('users')
          .select('id, employee_id, name, email, department, role, status')
          .ilike('role', '%lead%');
        if (!cancelled && !supaErr && Array.isArray(supaLeads) && supaLeads.length > 0) {
          const activeLeads = supaLeads.filter((u: any) => {
            const st = String(u.status || '').trim().toLowerCase();
            return st !== 'deleted' && st !== 'inactive';
          });
          setTeamLeadsFromDb(
            activeLeads.map((u) => ({
              id: (u as any).employee_id || u.id,
              name: u.name || (u.email || '').split('@')[0],
              department: u.department || 'Other',
              email: u.email || '',
            }))
          );
          return;
        }
      } catch (err) {
        console.warn('Supabase leads query fallback warning:', err);
      }

      // 2. Backend directory endpoint
      const result = await apiRequestSafe<any[]>('/users/directory?role=teamlead');
      if (!cancelled && !result.error && Array.isArray(result.data) && result.data.length > 0) {
        const activeLeads = result.data.filter((u: any) => {
          const st = String(u.status || '').trim().toLowerCase();
          return st !== 'deleted' && st !== 'inactive';
        });
        setTeamLeadsFromDb(
          activeLeads.map((u) => ({
            id: (u as any).employee_id || u.id,
            name: u.name || (u.email || '').split('@')[0],
            department: u.department || 'Other',
            email: u.email || '',
          }))
        );
      }
    };

    void fetchTeamLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required (e.g. OKL101)';
    }

    // Strict RFC Email Validation
    const cleanEmail = formData.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@oklut.com)';
    }

    // Strict 10-Digit Mobile Number Validation
    const cleanDigits = formData.phone.replace(/\D/g, '');
    if (!cleanDigits) {
      newErrors.phone = 'Contact number is required';
    } else if (cleanDigits.length !== 10) {
      newErrors.phone = 'Mobile number must be exactly 10 digits (e.g. 9876543210)';
    }

    if (!formData.department) {
      newErrors.department = 'Department selection is required';
    } else if (formData.department === 'Others' && !formData.customDepartment.trim()) {
      newErrors.customDepartment = 'Enter department name';
    }

    if (!formData.role) {
      newErrors.role = 'Role selection is required';
    } else if (formData.role === 'Employee' && !formData.teamLead) {
      newErrors.teamLead = 'Team Lead selection is required';
    }

    if (!formData.password) {
      newErrors.password = 'Initial password is required';
    } else {
      const pwdRes = validatePassword(formData.password);
      if (!pwdRes.isValid) {
        newErrors.password = 'Password does not meet all security requirements';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password and Confirm Password do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    const finalDepartment = formData.department === 'Others' ? formData.customDepartment.trim() : formData.department;
    const cleanEmpId = formData.employeeId.trim().toUpperCase();
    const cleanDigits = formData.phone.replace(/\D/g, '');

    try {
      await AdminApiService.addUser({
        name: formData.name.trim(),
        employeeId: cleanEmpId,
        email: formData.email.trim().toLowerCase(),
        phone: cleanDigits,
        department: finalDepartment as UserDepartment,
        role: formData.role as UserRole,
        teamLead: formData.role === 'Employee' ? formData.teamLead : undefined,
        password: formData.password,
        userDetails: formData.userDetails,
        sendEmailInvite: false // Direct addition, no invitation step
      });

      const BASE_URL = 'https://sudheshnabharadwaj.github.io/Ticketing-System-';
      const targetLoginUrl = formData.role === 'Team Lead' 
        ? `${BASE_URL}/teamlead/index.html#/login` 
        : formData.role === 'Admin'
        ? `${BASE_URL}/admin/index.html#/login`
        : `${BASE_URL}/employee/index.html#/signin`;

      setCreatedUserSummary({
        employeeId: cleanEmpId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        department: finalDepartment,
        loginUrl: targetLoginUrl,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        employeeId: err?.message || 'Failed to create user. Employee ID or Email may already exist.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employeeId: '',
      email: '',
      phone: '',
      department: '',
      customDepartment: '',
      role: '',
      teamLead: '',
      password: '',
      confirmPassword: '',
      userDetails: '',
    });
    setErrors({});
    setIsSuccess(false);
  };

  const handleCancel = () => {
    resetForm();
    navigate('/admin/administration/users');
  };

  // Filter Team Leads based on selected department
  const currentDepartmentName = formData.department === 'Others'
    ? (formData.customDepartment.trim() || 'Other')
    : (formData.department || '');

  const filteredTeamLeads = currentDepartmentName
    ? teamLeadsFromDb.filter(tl => {
        const tlDept = (tl.department || '').toLowerCase().trim();
        const curDept = currentDepartmentName.toLowerCase().trim();
        if (tlDept === curDept) return true;
        if ((curDept === 'qa team' || curDept === 'qa') && (tlDept === 'qa' || tlDept === 'qa team' || tlDept.includes('qa') || tlDept.includes('quality'))) return true;
        if (curDept === 'hr' && (tlDept === 'hr' || tlDept.includes('hr') || tlDept.includes('human'))) return true;
        if ((curDept === 'it support' || curDept === 'it') && (tlDept === 'it' || tlDept.includes('it'))) return true;
        return tlDept.includes(curDept) || curDept.includes(tlDept);
      })
    : teamLeadsFromDb;

  const displayTeamLeads = filteredTeamLeads;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-semibold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to User Directory
            </button>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Add New User</h1>
          <p className="text-xs text-slate-500">
            Create and provision a verified account for an Admin, Team Lead, or Employee directly.
          </p>
        </div>
      </div>

      {isSuccess && createdUserSummary ? (
        <Card>
          <div className="text-center py-6 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">User Successfully Created</h3>
              <p className="text-xs text-slate-500 mt-1">
                Account has been directly activated in the enterprise database.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0284C7]" /> Account Credentials
                </span>
                <Badge variant="primary">{createdUserSummary.role}</Badge>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans font-medium">Employee ID:</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{createdUserSummary.employeeId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans font-medium">Login Email:</span>
                  <span className="font-semibold text-slate-900">{createdUserSummary.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans font-medium">Password:</span>
                  <span className="font-bold text-[#0284C7] bg-white px-2 py-0.5 rounded border border-slate-200">{createdUserSummary.password}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans font-medium">Department:</span>
                  <span className="font-medium text-slate-800">{createdUserSummary.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans font-medium">Portal URL:</span>
                  <a href={createdUserSummary.loginUrl} target="_blank" rel="noreferrer" className="text-[#0284C7] hover:underline font-sans text-[11px]">
                    {createdUserSummary.loginUrl}
                  </a>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs font-semibold border-slate-300"
                onClick={() => {
                  const text = `Ticketing Platform Account Details:\nEmployee ID: ${createdUserSummary.employeeId}\nEmail: ${createdUserSummary.email}\nPassword: ${createdUserSummary.password}\nPortal URL: ${createdUserSummary.loginUrl}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2000);
                }}
                icon={copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedCreds ? 'Copied Details!' : 'Copy Credentials'}
              </Button>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Add Another User
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/admin/administration/users')}>
                View User Directory
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="User Details" subtitle="Enter user credentials, role and department assignment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <Input
                label="Full Name *"
                placeholder="e.g. Rajesh Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                icon={<UserPlus className="w-4 h-4" />}
              />

              {/* Employee ID */}
              <Input
                label="Employee ID *"
                placeholder="e.g. OKL101"
                value={formData.employeeId}
                onChange={(e) => {
                  setFormData({ ...formData, employeeId: e.target.value.toUpperCase() });
                  if (errors.employeeId) setErrors({ ...errors, employeeId: undefined });
                }}
                error={errors.employeeId}
                icon={<BadgeCheck className="w-4 h-4" />}
                helperText="Authoritative format: OKL### (e.g. OKL101, OKL102)"
              />

              {/* Email */}
              <Input
                label="Email Address *"
                type="email"
                placeholder="name@oklut.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
              />

              {/* Phone Number */}
              <Input
                label="Phone Number (10 digits) *"
                placeholder="e.g. 9876543210"
                type="tel"
                name="phone"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                error={errors.phone}
                icon={<Phone className="w-4 h-4" />}
              />

              {/* Department */}
              <Select
                label="Department *"
                value={formData.department}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    department: e.target.value,
                    teamLead: '' // reset team lead when department changes
                  });
                  if (errors.department) setErrors({ ...errors, department: undefined });
                }}
                error={errors.department}
                options={[
                  { value: '', label: 'Select Department', disabled: true, hidden: true },
                  { value: 'IT Support', label: 'IT Support' },
                  { value: 'HR', label: 'HR' },
                  { value: 'Finance', label: 'Finance' },
                  { value: 'Development', label: 'Development' },
                  { value: 'QA Team', label: 'QA Team' },
                  { value: 'Others', label: 'Other' },
                ]}
              />

              {/* Custom Department */}
              {formData.department === 'Others' && (
                <Input
                  label="Specify Department Name *"
                  placeholder="Enter custom department"
                  value={formData.customDepartment}
                  onChange={(e) => setFormData({ ...formData, customDepartment: e.target.value })}
                  error={errors.customDepartment}
                  icon={<Building2 className="w-4 h-4" />}
                />
              )}

              {/* Role */}
              <Select
                label="System Role *"
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value });
                  if (errors.role) setErrors({ ...errors, role: undefined });
                }}
                error={errors.role}
                options={[
                  { value: '', label: 'Select Role', disabled: true, hidden: true },
                  { value: 'Employee', label: 'Employee' },
                  { value: 'Team Lead', label: 'Team Lead' },
                ]}
              />

              {/* Team Lead Selection (Visible when Employee role selected) */}
              {formData.role === 'Employee' && (
                <Select
                  label="Assigned Team Lead *"
                  value={formData.teamLead}
                  onChange={(e) => {
                    setFormData({ ...formData, teamLead: e.target.value });
                    if (errors.teamLead) setErrors({ ...errors, teamLead: undefined });
                  }}
                  error={errors.teamLead}
                  options={[
                    { value: '', label: 'Select Team Lead', disabled: true, hidden: true },
                    ...displayTeamLeads.map((tl) => ({
                      value: `${tl.name} (${tl.id})`,
                      label: `${tl.name} — ${tl.id} (${tl.department})`,
                    })),
                  ]}
                />
              )}

              {/* Password */}
              <div className="sm:col-span-2 space-y-1">
                <Input
                  label="Password *"
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Set initial account password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  error={errors.password}
                  icon={<Key className="w-4 h-4" />}
                />
                <PasswordStrengthValidator password={formData.password} />
              </div>

              {/* Confirm Password */}
              <div className="sm:col-span-2">
                <Input
                  label="Confirm Password *"
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  error={errors.confirmPassword}
                  icon={<Key className="w-4 h-4" />}
                />
              </div>

            </div>

            {/* Action Buttons: Cancel and Add User */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" /> Fields marked with * are required.
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
