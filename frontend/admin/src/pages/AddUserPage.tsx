import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PasswordStrengthValidator, validatePassword } from '../components/ui/PasswordStrengthValidator';
import type { UserRole, UserDepartment } from '../types';
import { AdminApiService } from '../services/api';
import { OrganizationService } from '../services/organizationService';
import {
  UserPlus,
  Mail,
  Phone,
  Key,
  Copy,
  Check,
  Share2,
  Send,
  UserCheck,
  ArrowLeft,
  Info,
  Building2,
  BadgeCheck
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
    sendEmailInvite: true
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [createdUserSummary, setCreatedUserSummary] = useState<{
    employeeId: string;
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
    loginUrl: string;
    inviteToken?: string;
    shareableLink?: string;
    emailNotification?: any;
  } | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    } else {
      const cleanEmpId = formData.employeeId.trim().toUpperCase();
      if (OrganizationService.isEmployeeIdTaken(cleanEmpId)) {
        newErrors.employeeId = 'Employee ID already exists.';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address format (e.g. name@company.com)';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
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

    if (!formData.sendEmailInvite || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required when not sending auto-invite';
      } else {
        const pwdRes = validatePassword(formData.password);
        if (!pwdRes.isValid) {
          newErrors.password = 'Password does not meet all security requirements';
        }
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Password and Confirm Password do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const finalDepartment = formData.department === 'Others' ? formData.customDepartment : formData.department;
    const cleanEmpId = formData.employeeId.trim().toUpperCase();

    try {
      const addedUser = await AdminApiService.addUser({
        name: formData.name.trim(),
        employeeId: cleanEmpId,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: finalDepartment as UserDepartment,
        role: formData.role as UserRole,
        teamLead: formData.role === 'Employee' ? formData.teamLead : undefined,
        password: formData.password,
        userDetails: formData.userDetails,
        sendEmailInvite: formData.sendEmailInvite
      });

      // Synchronize with OrganizationService layer
      if (formData.role === 'Team Lead') {
        OrganizationService.addTeamLead({
          id: cleanEmpId,
          employeeId: cleanEmpId,
          name: formData.name.trim(),
          role: `${finalDepartment} Team Lead`,
          departmentId: 'D-NEW',
          departmentName: finalDepartment,
          email: formData.email.trim()
        });
      } else if (formData.role === 'Employee') {
        OrganizationService.addEmployee({
          id: cleanEmpId,
          employeeId: cleanEmpId,
          name: formData.name.trim(),
          role: 'Team Member',
          teamLeadId: formData.teamLead,
          departmentId: 'D-NEW',
          departmentName: finalDepartment,
          email: formData.email.trim()
        });
      }

      const tokenUsed = (addedUser as any).inviteToken || '';
      const mappedRole = formData.role === 'Team Lead' ? 'teamlead' : formData.role === 'Admin' ? 'admin' : 'employee';
      const targetLoginUrl = formData.role === 'Team Lead' ? 'http://localhost:4174/login' : 'http://localhost:4173/signin';
      const realSignupUrl = formData.role === 'Team Lead'
        ? `http://localhost:4174/login?email=${encodeURIComponent(formData.email.trim())}`
        : `http://localhost:4173/signin?email=${encodeURIComponent(formData.email.trim())}`;

      setShareableLink(realSignupUrl);
      
      setCreatedUserSummary({
        employeeId: cleanEmpId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || 'Password123',
        role: formData.role,
        department: finalDepartment,
        loginUrl: targetLoginUrl,
        inviteToken: tokenUsed,
        shareableLink: realSignupUrl,
        emailNotification: (addedUser as any).emailNotification
      });
      
      setIsSuccess(true);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        employeeId: err?.message || 'Employee ID already exists.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
      sendEmailInvite: true
    });
    setErrors({});
    setIsSuccess(false);
  };

  const currentDepartmentName = formData.department === 'Others'
    ? (formData.customDepartment.trim() || 'Other')
    : (formData.department || 'IT Support');

  const availableTeamLeads = OrganizationService.getTeamLeadsByDepartment(currentDepartmentName);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
            <span className="text-slate-300">•</span>
            <Badge variant="primary" dot>User Provisioning</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 mb-0">Add New User</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision team members, set roles and department access, and issue onboarding invitations.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="text-center py-8 space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 border border-emerald-200">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">User Successfully Created!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Account created for <strong className="text-slate-900">{formData.name}</strong> ({formData.role}) in {formData.department === 'Others' ? formData.customDepartment : formData.department}.
              </p>
            </div>

            {/* Team Lead / Employee Credentials & Verification Details */}
            {createdUserSummary && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl text-left space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#0284C7]" /> Login Credentials & Verification
                  </span>
                  <Badge variant="primary">
                    {createdUserSummary.role}
                  </Badge>
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
                    <span className="text-slate-500 font-sans font-medium">Temporary Password:</span>
                    <span className="font-bold text-[#0284C7] bg-white px-2 py-0.5 rounded border border-slate-200">{createdUserSummary.password}</span>
                  </div>
                  {createdUserSummary.inviteToken && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-sans font-medium">Verification Token:</span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{createdUserSummary.inviteToken}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans font-medium">Login Portal:</span>
                    <a href={createdUserSummary.loginUrl} target="_blank" rel="noreferrer" className="text-[#0284C7] hover:underline font-sans text-[11px]">
                      {createdUserSummary.loginUrl}
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center text-xs font-semibold border-slate-300"
                    onClick={() => {
                      const text = `Ticketing Platform Account Details:\nEmployee ID: ${createdUserSummary.employeeId}\nEmail: ${createdUserSummary.email}\nPassword: ${createdUserSummary.password}\nVerification Token: ${createdUserSummary.inviteToken || 'N/A'}\nSignup Link: ${createdUserSummary.shareableLink || ''}\nLogin Portal: ${createdUserSummary.loginUrl}`;
                      navigator.clipboard.writeText(text);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 2000);
                    }}
                    icon={copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedCreds ? 'Copied Details!' : 'Copy Credentials & Token'}
                  </Button>
                  {createdUserSummary.shareableLink && (
                    <a
                      href={createdUserSummary.shareableLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                    >
                      Open Link ↗
                    </a>
                  )}
                </div>

                {createdUserSummary.emailNotification?.smtp_sent ? (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Live invitation email delivered to <strong>{createdUserSummary.email}</strong> via SMTP.
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Account invitation and token prepared. For live inbox delivery to Gmail, add a 16-character Google App Password in Admin Settings. Share the onboarding link below with the user directly.
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Linking / Invitation Flow Section */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-[#0284C7]" /> Share Onboarding Link
                </span>
                <Badge variant={formData.sendEmailInvite ? 'success' : 'neutral'}>
                  {formData.sendEmailInvite ? 'Email Sent' : 'Link Ready'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableLink}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono"
                />
                <Button variant="secondary" size="sm" onClick={handleCopyLink} icon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}>
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Add Another User
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/admin/administration/users')}>
                View User List
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="User Details" subtitle="Enter user identification, role and department credentials">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <Input
                label="Full Name *"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                icon={<UserPlus className="w-4 h-4" />}
              />

              {/* Employee ID */}
              <Input
                label="Employee ID *"
                placeholder="e.g. TL001 or EMP001"
                value={formData.employeeId}
                onChange={(e) => {
                  setFormData({ ...formData, employeeId: e.target.value.toUpperCase() });
                  if (errors.employeeId) setErrors({ ...errors, employeeId: undefined });
                }}
                error={errors.employeeId}
                icon={<BadgeCheck className="w-4 h-4" />}
                helperText="Unique ID (e.g. TL001 for Team Lead, EMP001 for Employee)"
              />

              {/* Email */}
              <Input
                label="Email Address *"
                type="email"
                placeholder="john.doe@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
              />

              {/* Phone Number */}
              <Input
                label="Phone Number *"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Legal', label: 'Legal' },
                  { value: 'Facilities', label: 'Facilities' },
                  { value: 'Others', label: 'Others' },
                ]}
              />

              {/* Custom Department Field if "Others" selected */}
              {formData.department === 'Others' && (
                <div className="sm:col-span-2">
                  <Input
                    label="Department Name / Type Department *"
                    placeholder="Enter department name"
                    value={formData.customDepartment}
                    onChange={(e) => {
                      setFormData({ ...formData, customDepartment: e.target.value });
                      if (errors.customDepartment) setErrors({ ...errors, customDepartment: undefined });
                    }}
                    error={errors.customDepartment}
                    icon={<Building2 className="w-4 h-4" />}
                  />
                </div>
              )}

              {/* Role */}
              <Select
                label="Role *"
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value, teamLead: '' });
                  if (errors.role) setErrors({ ...errors, role: undefined });
                }}
                error={errors.role}
                options={[
                  { value: '', label: 'Select Role', disabled: true, hidden: true },
                  { value: 'Team Lead', label: 'Team Lead' },
                  { value: 'Employee', label: 'Employee' },
                ]}
              />

              {/* Team Lead field - Shown ONLY when Role = Employee */}
              {formData.role === 'Employee' && (
                <Select
                  label="Team Lead *"
                  value={formData.teamLead}
                  onChange={(e) => {
                    setFormData({ ...formData, teamLead: e.target.value });
                    if (errors.teamLead) setErrors({ ...errors, teamLead: undefined });
                  }}
                  error={errors.teamLead}
                  options={[
                    { value: '', label: 'Select Team Lead', disabled: true, hidden: true },
                    ...availableTeamLeads.map((tl) => ({
                      value: `${tl.name} (${tl.employeeId})`,
                      label: `${tl.name} — ${tl.employeeId} (${tl.role})`,
                    })),
                  ]}
                />
              )}

              {/* Password */}
              <div className="sm:col-span-2 space-y-1">
                <Input
                  label="Password *"
                  type="password"
                  placeholder="Set initial password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  error={errors.password}
                  icon={<Key className="w-4 h-4" />}
                  helperText={formData.sendEmailInvite ? 'Optional if instant email invitation is enabled' : undefined}
                />
                <PasswordStrengthValidator password={formData.password} />
              </div>

              {/* Confirm Password */}
              <div className="sm:col-span-2">
                <Input
                  label="Confirm Password *"
                  type="password"
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

              {/* Additional User Details */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  User Notes / Access Details
                </label>
                <textarea
                  rows={3}
                  value={formData.userDetails}
                  onChange={(e) => setFormData({ ...formData, userDetails: e.target.value })}
                  placeholder="Specify Employee ID, office location, or special workspace notes..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                />
              </div>
            </div>
          </Card>

          {/* Linking / Invitation Options */}
          <Card title="Invitation & Access Method">
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.sendEmailInvite}
                  onChange={(e) => setFormData({ ...formData, sendEmailInvite: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#2563EB]" /> Send Email Invitation & Share Link
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically dispatches an onboard invitation email containing a direct login link and password setup.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" /> All fields marked with * are required.
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => navigate('/admin/dashboard')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    {isSubmitting ? 'Creating User...' : 'Add User'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
