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
  Building2
} from 'lucide-react';

const mockTeamLeadsByDept: Record<string, string[]> = {
  'IT Support': ['Manikanta (IT Lead)', 'Hyma (IT Lead)'],
  'HR': ['Adi (HR Lead)', 'Sudha (HR Lead)'],
  'Finance': ['Kotesh (Finance Lead)'],
  'Operations': ['Mounika (Ops Lead)'],
  'Facilities': ['Uday (Facilities Lead)'],
  'Others': ['General Department Lead'],
};

export const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required';
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

    try {
      await AdminApiService.addUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: finalDepartment as UserDepartment,
        role: formData.role as UserRole,
        password: formData.password,
        userDetails: formData.userDetails,
        sendEmailInvite: formData.sendEmailInvite
      });

      const inviteToken = Math.random().toString(36).substring(2, 10);
      setShareableLink(`https://ticketing.company.com/invite?token=${inviteToken}&email=${encodeURIComponent(formData.email)}`);
      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to create user:', err);
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

  const currentDepartmentKey = formData.department || 'Others';
  const availableTeamLeads = mockTeamLeadsByDept[currentDepartmentKey] || ['Department Team Lead'];

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

            {/* Linking / Invitation Flow Section */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-[#0284C7]" /> Share Invitation Link
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

              {formData.sendEmailInvite && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Send className="w-3.5 h-3.5 text-emerald-600" /> An invitation email was automatically dispatched to <strong>{formData.email}</strong>.
                </p>
              )}
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
                    ...availableTeamLeads.map(tl => ({ value: tl, label: tl }))
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
