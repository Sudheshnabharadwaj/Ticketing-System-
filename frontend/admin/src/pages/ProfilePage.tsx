import React, { useState, useEffect, useRef } from 'react';
import { User, ShieldCheck, Building2, Camera, Upload, Edit3, Save, X, Mail, Phone, Lock, CheckCircle2, AlertCircle, Key } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { supabase } from '../services/supabaseClient';
import { getCurrentSessionUser, setSessionUser } from '../services/unifiedAuth';

export interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  avatarUrl?: string;
}

export function getAdminProfile(): AdminProfileData {
  const cached = localStorage.getItem('admin_profile_data');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.name && !parsed.name.toLowerCase().includes('hyma') && !parsed.email?.toLowerCase().includes('hyma')) {
        return parsed;
      }
    } catch {}
  }

  const session = getCurrentSessionUser();
  if (session && session.name) {
    const roleTitle = session.role === 'admin'
      ? 'System Administrator'
      : session.role === 'teamlead'
      ? 'Team Lead'
      : 'Employee';
    return {
      name: session.name,
      email: session.email,
      role: roleTitle,
      department: session.department || 'IT Operations',
      phone: session.phone || '+1 (555) 019-2834',
      avatarUrl: session.avatarUrl || localStorage.getItem('admin_profile_avatar') || '',
    };
  }

  return {
    name: 'Sudheshna Bharadwaj',
    email: 'sudheshna@gmail.com',
    role: 'System Administrator',
    department: 'IT Operations',
    phone: '+1 (555) 019-2834',
    avatarUrl: localStorage.getItem('admin_profile_avatar') || '',
  };
}

export function saveAdminProfile(data: AdminProfileData) {
  localStorage.setItem('admin_profile_data', JSON.stringify(data));
  if (data.avatarUrl) {
    localStorage.setItem('admin_profile_avatar', data.avatarUrl);
  } else {
    localStorage.removeItem('admin_profile_avatar');
  }
  window.dispatchEvent(new Event('storage'));
}

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<AdminProfileData>(getAdminProfile());
  const [isEditing, setIsEditing] = useState(false);

  // Form edit state
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editRole, setEditRole] = useState(profile.role);
  const [editDepartment, setEditDepartment] = useState(profile.department);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Purge legacy hyma data if present
    try {
      const raw = localStorage.getItem('admin_profile_data');
      if (raw && (raw.toLowerCase().includes('hyma') || raw.toLowerCase().includes('hyma.admin@company.com'))) {
        localStorage.removeItem('admin_profile_data');
        localStorage.removeItem('admin_profile_avatar');
      }
    } catch {}

    const initial = getAdminProfile();
    setProfile(initial);
    setEditName(initial.name);
    setEditEmail(initial.email);
    setEditRole(initial.role);
    setEditDepartment(initial.department);
    setEditPhone(initial.phone);
    setEditAvatarUrl(initial.avatarUrl || '');

    // Fetch live user from Supabase to keep in sync
    const fetchLiveUser = async () => {
      const session = getCurrentSessionUser();
      const targetEmail = session?.email || initial.email;
      if (!targetEmail) return;

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', targetEmail.trim().toLowerCase())
          .maybeSingle();

        if (dbUser) {
          const liveProfile: AdminProfileData = {
            name: dbUser.name || initial.name,
            email: dbUser.email || initial.email,
            role: dbUser.designation || (dbUser.role === 'admin' ? 'System Administrator' : dbUser.role === 'teamlead' ? 'Team Lead' : 'Employee'),
            department: dbUser.department || initial.department,
            phone: dbUser.phone || initial.phone,
            avatarUrl: dbUser.avatar || initial.avatarUrl || '',
          };
          setProfile(liveProfile);
          setEditName(liveProfile.name);
          setEditEmail(liveProfile.email);
          setEditRole(liveProfile.role);
          setEditDepartment(liveProfile.department);
          setEditPhone(liveProfile.phone);
          setEditAvatarUrl(liveProfile.avatarUrl || '');
          saveAdminProfile(liveProfile);
        }
      } catch (err) {
        console.warn('Supabase profile fetch warning:', err);
      }
    };

    fetchLiveUser();
  }, []);

  const startEditing = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditRole(profile.role);
    setEditDepartment(profile.department);
    setEditPhone(profile.phone);
    setEditAvatarUrl(profile.avatarUrl || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminProfileData = {
      name: editName.trim() || profile.name,
      email: editEmail.trim() || profile.email,
      role: editRole.trim() || profile.role,
      department: editDepartment.trim() || profile.department,
      phone: editPhone.trim() || profile.phone,
      avatarUrl: editAvatarUrl,
    };
    saveAdminProfile(updated);
    setProfile(updated);
    setIsEditing(false);

    // Update current session user in localStorage
    const session = getCurrentSessionUser();
    if (session) {
      setSessionUser({
        ...session,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        department: updated.department,
        avatarUrl: updated.avatarUrl,
      });
    }

    // Sync profile changes to Supabase public.users
    try {
      await supabase
        .from('users')
        .update({
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          department: updated.department,
          avatar: updated.avatarUrl || null,
          designation: updated.role,
          updated_at: new Date().toISOString()
        })
        .or(`email.eq.${profile.email},email.eq.${updated.email}`);
    } catch (err) {
      console.warn('Supabase profile sync warning:', err);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!newPassword || newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsChangingPwd(true);
    try {
      // 1. Update in Supabase Auth
      await supabase.auth.updateUser({ password: newPassword });

      // 2. Update in PostgreSQL public.users
      await supabase
        .from('users')
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('email', profile.email);

      setPwdMsg({ type: 'success', text: 'Password successfully updated in your account and Supabase Auth.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditing) {
          setEditAvatarUrl(result);
        } else {
          const updated = { ...profile, avatarUrl: result };
          saveAdminProfile(updated);
          setProfile(updated);
          setEditAvatarUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const displayAvatar = isEditing ? editAvatarUrl : profile.avatarUrl;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Hidden File Input for Direct Local Image Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your administrative account, contact details, and department permissions.
          </p>
        </div>

        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            icon={<Edit3 className="w-4 h-4 text-[#0284C7]" />}
            className="border-slate-200 text-slate-700 font-semibold"
          >
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              icon={<X className="w-4 h-4 text-slate-400" />}
              className="border-slate-200 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveProfile}
              icon={<Save className="w-4 h-4" />}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs"
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="max-w-3xl bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* User Identity Header with Profile Avatar Support */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={profile.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
                  {(isEditing ? editName : profile.name)
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-[#0284C7] hover:border-[#0284C7] shadow-xs cursor-pointer transition-all"
                title="Upload profile photo from computer"
              >
                <Camera className="w-4 h-4 text-[#0284C7]" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? editName || 'Admin Name' : profile.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200/60 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 inline" /> {isEditing ? editRole : profile.role}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-[#0284C7]" />
            Upload Photo from Computer
          </Button>
        </div>

        {/* Profile Attributes / Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter full name"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-900">
                  {profile.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-900">
                  {profile.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Department <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  options={[
                    { value: 'IT Support', label: 'IT Support' },
                    { value: 'Finance', label: 'Finance' },
                    { value: 'HR Operations', label: 'HR Operations' },
                    { value: 'Facilities', label: 'Facilities' },
                    { value: 'General Administration', label: 'General Administration' },
                  ]}
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-900">
                  {profile.department}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Administrative Role <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Enter role (e.g. System Administrator)"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-900">
                  {profile.role}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Number
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter contact number"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-900">
                  {profile.phone}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                className="border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs"
              >
                <Save className="w-4 h-4 mr-1.5" /> Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Security & Password Change Section */}
      <div className="max-w-3xl bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0284C7]" /> Security & Password Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Update your account password securely. Changes will take effect immediately across all sessions and Supabase Auth.
          </p>
        </div>

        {pwdMsg && (
          <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            pwdMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {pwdMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {pwdMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" /> New Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Confirm New Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Must contain minimum 8 characters with letters and numbers.
            </span>
            <Button
              type="submit"
              variant="primary"
              disabled={isChangingPwd}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold text-xs py-2 px-4 shadow-2xs"
            >
              {isChangingPwd ? 'Updating Password...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
