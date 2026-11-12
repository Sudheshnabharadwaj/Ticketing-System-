import React, { useState, useEffect, useRef } from 'react';
import { User, ShieldCheck, Building2, Camera, Upload, Edit3, Save, X, Mail, Phone, CheckCircle2, AlertCircle, Key, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { apiRequest, apiRequestSafe } from '../services/backendAuth';
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
      department: session.department || '',
      phone: session.phone || '',
      avatarUrl: session.avatarUrl || '',
    };
  }

  // No cached/hardcoded identity: the page loads the real profile from the API.
  return {
    name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    avatarUrl: '',
  };
}

export function saveAdminProfile(data: AdminProfileData) {
  sessionStorage.setItem('admin_profile_data', JSON.stringify(data));
  localStorage.setItem('admin_profile_data', JSON.stringify(data));
  if (data.avatarUrl) {
    sessionStorage.setItem('admin_profile_avatar', data.avatarUrl);
    localStorage.setItem('admin_profile_avatar', data.avatarUrl);
  } else {
    sessionStorage.removeItem('admin_profile_avatar');
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

  // Validation & feedback state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSession = getCurrentSessionUser();
  const [userId, setUserId] = useState<string>(currentSession?.id || '');

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

    // Load the authoritative profile from the backend (scoped to the token).
    const fetchLiveUser = async () => {
      const result = await apiRequestSafe<any>('/users/profile');
      if (result.error || !result.data) {
        console.warn('Profile fetch warning:', result.error);
        return;
      }
      const dbUser = result.data;
      const liveProfile: AdminProfileData = {
        name: dbUser.name || initial.name,
        email: dbUser.email || initial.email,
        role:
          dbUser.designation ||
          (dbUser.role === 'admin'
            ? 'System Administrator'
            : dbUser.role === 'teamlead'
            ? 'Team Lead'
            : 'Employee'),
        department: dbUser.department || initial.department,
        phone: dbUser.phone || '',
        avatarUrl: dbUser.avatar || '',
      };
      if (dbUser.id) setUserId(dbUser.id);
      setProfile(liveProfile);
      setEditName(liveProfile.name);
      setEditEmail(liveProfile.email);
      setEditRole(liveProfile.role);
      setEditDepartment(liveProfile.department);
      setEditPhone(liveProfile.phone);
      setEditAvatarUrl(liveProfile.avatarUrl || '');
      saveAdminProfile(liveProfile);
      const session = getCurrentSessionUser();
      if (session) {
        setSessionUser({
          ...session,
          id: dbUser.id || session.id,
          name: liveProfile.name,
          email: liveProfile.email,
          department: liveProfile.department,
          phone: liveProfile.phone,
          avatarUrl: liveProfile.avatarUrl,
        });
      }
    };

    fetchLiveUser();
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const startEditing = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditRole(profile.role);
    setEditDepartment(profile.department);
    setEditPhone(profile.phone);
    setEditAvatarUrl(profile.avatarUrl || '');
    setValidationError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setValidationError(null);
    setIsEditing(false);
  };

  const handleRemovePhoto = async () => {
    setEditAvatarUrl('');
    const updated: AdminProfileData = {
      ...profile,
      avatarUrl: '',
    };

    try {
      // Clears only the avatar column for this authenticated user.
      await apiRequest('/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: '' }),
      });
      saveAdminProfile(updated);
      setProfile(updated);

      const activeSession = getCurrentSessionUser();
      if (activeSession) {
        setSessionUser({ ...activeSession, avatarUrl: '' });
      }
      setToastMessage('Profile photo removed. Your account is unchanged.');
    } catch (err) {
      console.warn('Failed to clear avatar:', err);
      setValidationError(
        err instanceof Error ? err.message : 'Could not remove the profile photo. Please try again.'
      );
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Strict RFC Email Validation (email is read-only on this form)
    const cleanEmail = editEmail.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setValidationError('Please enter a valid email address (e.g., name@oklut.com).');
      return;
    }

    // 2. Strict 10-Digit Mobile Number Validation
    const cleanDigits = editPhone.replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setValidationError('Contact number must be exactly 10 digits (e.g., 9876543210).');
      return;
    }

    try {
      const saved = await apiRequest<any>('/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || profile.name,
          phone: cleanDigits,
          designation: editRole.trim() || profile.role,
          department: editDepartment.trim() || profile.department,
          avatar: editAvatarUrl || undefined,
        }),
      });

      const updated: AdminProfileData = {
        name: saved.name || editName.trim() || profile.name,
        email: saved.email || cleanEmail,
        role: saved.designation || editRole.trim() || profile.role,
        department: saved.department || editDepartment.trim() || profile.department,
        phone: saved.phone || cleanDigits,
        avatarUrl: saved.avatar ?? editAvatarUrl,
      };

      saveAdminProfile(updated);
      setProfile(updated);
      setEditAvatarUrl(updated.avatarUrl || '');
      setIsEditing(false);

      const activeSession = getCurrentSessionUser();
      setSessionUser({
        id: saved.id || activeSession?.id || userId,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        department: updated.department,
        avatarUrl: updated.avatarUrl,
        role: activeSession?.role || 'admin',
        status: activeSession?.status || 'Active',
        createdAt: activeSession?.createdAt,
      });

      window.dispatchEvent(new Event('storage'));
      setToastMessage('Profile details successfully updated.');
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Could not save your profile. Please try again.'
      );
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationError('Please choose an image file for your profile photo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setValidationError('Profile photos must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setEditAvatarUrl(result);
      if (isEditing) return;

      // Persist the photo immediately for the authenticated user.
      try {
        const saved: any = await apiRequest('/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: result }),
        });
        const savedAvatar = saved?.avatar || saved?.avatarUrl || saved?.avatar_url || result;
        const updated = { ...profile, avatarUrl: savedAvatar };
        saveAdminProfile(updated);
        setProfile(updated);
        const session = getCurrentSessionUser();
        if (session) setSessionUser({ ...session, avatarUrl: savedAvatar });
        setToastMessage('Profile photo updated.');
      } catch (err) {
        setValidationError(
          err instanceof Error ? err.message : 'Could not save the profile photo.'
        );
      }
    };
    reader.readAsDataURL(file);
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

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200/60 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 inline" /> {isEditing ? editRole : profile.role}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                  <Key className="w-3 h-3 text-[#0284C7]" />
                  User ID: <span className="text-[#0284C7]">{userId}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-[#0284C7]" />
              Upload Photo
            </Button>
            {displayAvatar && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemovePhoto}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                Remove Photo
              </Button>
            )}
          </div>
        </div>

        {/* Profile Attributes / Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#0284C7]" /> System User ID <span className="text-slate-400 font-normal">(Permanent Identifier)</span>
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-mono font-bold text-slate-900 flex items-center justify-between shadow-2xs">
                <span className="tracking-wide text-slate-900">{userId}</span>
                <span className="text-[10.5px] uppercase font-sans font-bold bg-sky-100 text-[#0284C7] px-2.5 py-0.5 rounded-full border border-sky-200">
                  Verified Identity
                </span>
              </div>
            </div>

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
                  placeholder="Enter email address (e.g. name@oklut.com)"
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
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Number (10-digit mobile) <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
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
    </div>
  );
};
