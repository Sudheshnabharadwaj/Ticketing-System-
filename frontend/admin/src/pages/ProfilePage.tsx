import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Shield,
  Building,
  Phone,
  BadgeCheck,
  Camera,
  Upload,
  Edit3,
  Save,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { apiRequestSafe } from '../services/backendAuth';
import { getCurrentSessionUser, setSessionUser } from '../services/unifiedAuth';

export interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  employeeId: string;
  avatarUrl?: string;
}

export function getAdminProfile(): AdminProfileData {
  const session = getCurrentSessionUser();
  if (session && session.name) {
    const roleTitle =
      session.role === 'admin'
        ? 'Security Administrator'
        : session.role === 'teamlead'
        ? 'Team Lead'
        : 'Employee';
    return {
      name: session.name,
      email: session.email,
      role: (session as any).designation || roleTitle,
      department: session.department || 'IT Support',
      phone: session.phone || '+1 (555) 000-0002',
      employeeId: session.id || (session as any).employeeId || 'ADM-001',
      avatarUrl: session.avatarUrl || '',
    };
  }

  return {
    name: 'shruthi',
    email: 's.ronda@oklut.com',
    role: 'Security Administrator',
    department: 'IT Support',
    phone: '+1 (555) 000-0002',
    employeeId: 'ADM-001',
    avatarUrl: '',
  };
}

export function saveAdminProfile(data: AdminProfileData) {
  try {
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
  } catch {}
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initial = getAdminProfile();
    setProfile(initial);
    setEditName(initial.name);
    setEditEmail(initial.email);
    setEditRole(initial.role);
    setEditDepartment(initial.department);
    setEditPhone(initial.phone);
    setEditAvatarUrl(initial.avatarUrl || '');

    // Authoritative backend sync
    const fetchLiveUser = async () => {
      const result = await apiRequestSafe<any>('/users/profile');
      if (result.error || !result.data) {
        return;
      }
      const dbUser = result.data;
      const liveProfile: AdminProfileData = {
        name: dbUser.name || initial.name,
        email: dbUser.email || initial.email,
        role:
          dbUser.designation ||
          (dbUser.role === 'admin'
            ? 'Security Administrator'
            : dbUser.role === 'teamlead'
            ? 'Team Lead'
            : 'Employee'),
        department: dbUser.department || initial.department,
        phone: dbUser.phone || initial.phone,
        employeeId: dbUser.employee_id || dbUser.id || initial.employeeId,
        avatarUrl: dbUser.avatar || dbUser.avatarUrl || initial.avatarUrl || '',
      };
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
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

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
      await apiRequestSafe('/users/profile', {
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
      setSuccessMsg('Profile photo removed.');
      window.dispatchEvent(new Event('storage'));
    } catch {
      setSuccessMsg('Profile photo removed.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanDigits = editPhone.replace(/\D/g, '');
    if (editPhone.trim() && cleanDigits.length !== 10) {
      setValidationError('Contact number must be exactly 10 digits (e.g. 9876543210).');
      return;
    }

    try {
      const res = await apiRequestSafe<any>('/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || profile.name,
          phone: cleanDigits || editPhone.trim(),
          designation: editRole.trim() || profile.role,
          department: editDepartment.trim() || profile.department,
          avatar: editAvatarUrl || undefined,
        }),
      });

      const saved = res.data || {};
      const updated: AdminProfileData = {
        name: saved.name || editName.trim() || profile.name,
        email: saved.email || editEmail.trim() || profile.email,
        role: saved.designation || editRole.trim() || profile.role,
        department: saved.department || editDepartment.trim() || profile.department,
        phone: saved.phone || editPhone.trim(),
        employeeId: profile.employeeId,
        avatarUrl: saved.avatar || saved.avatarUrl || editAvatarUrl || profile.avatarUrl,
      };

      setProfile(updated);
      setIsEditing(false);
      saveAdminProfile(updated);

      const activeSession = getCurrentSessionUser();
      if (activeSession) {
        setSessionUser({
          ...activeSession,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          department: updated.department,
          avatarUrl: updated.avatarUrl,
        });
      }

      window.dispatchEvent(new Event('storage'));
      setSuccessMsg('Profile details successfully updated.');
    } catch (err: any) {
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
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Profile photos must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setEditAvatarUrl(result);
      if (isEditing) return;

      try {
        const res = await apiRequestSafe<any>('/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: result }),
        });
        const savedAvatar = res.data?.avatar || res.data?.avatarUrl || result;
        const updated = { ...profile, avatarUrl: savedAvatar };
        saveAdminProfile(updated);
        setProfile(updated);
        const session = getCurrentSessionUser();
        if (session) setSessionUser({ ...session, avatarUrl: savedAvatar });
        window.dispatchEvent(new Event('storage'));
        setSuccessMsg('Profile photo updated successfully.');
      } catch (err: any) {
        setValidationError(err instanceof Error ? err.message : 'Could not save the profile photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const displayAvatar = isEditing ? editAvatarUrl : profile.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-12">
      {/* Hidden File Input for Image Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Feedback Banners */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Clean Profile Header Card - Identical to Reference Screenshot */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar Area with Camera overlay */}
          <div className="relative group shrink-0">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={profile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center font-bold text-2xl shadow-2xs">
                {(isEditing ? editName : profile.name)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'A'}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-[#0284C7] hover:border-[#0284C7] shadow-xs cursor-pointer transition-all"
              title="Upload profile photo from computer"
            >
              <Camera className="w-4 h-4 text-[#0284C7]" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {isEditing ? editName || 'Your Name' : profile.name}
              </h1>
              <BadgeCheck className="w-5 h-5 text-[#0284C7]" />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {isEditing ? editRole : profile.role} • {isEditing ? editDepartment : profile.department}
            </p>
            <div className="inline-flex items-center gap-3 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
                User ID: {profile.employeeId}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
              {displayAvatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#0284C7] shadow-2xs">
            User ID: {profile.employeeId}
          </div>

          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={startEditing}
              icon={<Edit3 className="w-4 h-4 text-[#0284C7]" />}
              className="border-slate-200 text-slate-700 font-semibold cursor-pointer"
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
                className="border-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveProfile}
                icon={<Save className="w-4 h-4" />}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Grid / Edit Form */}
      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-[#0284C7]" />
            <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </label>
              {isEditing ? (
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter full name"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                  {profile.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> Employee ID
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono font-bold text-[#0284C7]">
                {profile.employeeId}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                  {profile.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Organization & Role */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-[#0284C7]" />
            <h2 className="text-sm font-bold text-slate-900">Department & Contact</h2>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Department
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
                    { value: 'Security Operations', label: 'Security Operations' },
                  ]}
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                  {profile.department}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> System Role
              </label>
              {isEditing ? (
                <Input
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Enter role (e.g. Security Administrator)"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-emerald-700 inline-block bg-emerald-50 border-emerald-200">
                  {profile.role}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                  {profile.phone || '+1 (555) 000-0002'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Bar when editing */}
        {isEditing && (
          <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Click Save Changes to update your profile across the application.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                className="border-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1.5" /> Save Changes
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
