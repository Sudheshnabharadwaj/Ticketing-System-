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
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { apiRequestSafe } from '../../services/backendAuth';

const DEPARTMENT_OPTIONS = [
  'IT Support',
  'HR',
  'Finance',
  'Development',
  'QA Team',
  'Facilities',
  'General Administration',
  'Security Operations',
];

export const TeamLeadProfile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);

  // Form edit states
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editDepartment, setEditDepartment] = useState(user?.department || 'IT Support');
  const [editRole, setEditRole] = useState(user?.designation || (user?.role === 'teamlead' ? 'Team Lead' : user?.role || 'Team Lead'));
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatar || '');

  // Feedback states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when auth user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditDepartment(user.department || 'IT Support');
      setEditRole(user.designation || (user.role === 'teamlead' ? 'Team Lead' : user.role || 'Team Lead'));
      setEditPhone(user.phone || '');
      setEditAvatarUrl(user.avatar || '');
    }
  }, [user]);

  // Also fetch authoritative user profile from backend on mount
  useEffect(() => {
    const fetchLiveProfile = async () => {
      try {
        const res = await apiRequestSafe<any>('/users/profile');
        if (res.data) {
          const live = res.data;
          if (live.name) setEditName(live.name);
          if (live.email) setEditEmail(live.email);
          if (live.department) setEditDepartment(live.department);
          if (live.designation || live.role) {
            setEditRole(live.designation || (live.role === 'teamlead' ? 'Team Lead' : live.role));
          }
          if (live.phone) setEditPhone(live.phone);
          if (live.avatar || live.avatarUrl) {
            setEditAvatarUrl(live.avatar || live.avatarUrl);
          }
        }
      } catch {}
    };
    fetchLiveProfile();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setValidationError(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setValidationError(msg);
    setSuccessMsg(null);
    setTimeout(() => setValidationError(null), 4000);
  };

  const startEditing = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditDepartment(user?.department || 'IT Support');
    setEditRole(user?.designation || (user?.role === 'teamlead' ? 'Team Lead' : user?.role || 'Team Lead'));
    setEditPhone(user?.phone || '');
    setEditAvatarUrl(user?.avatar || '');
    setValidationError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditDepartment(user.department || 'IT Support');
      setEditRole(user.designation || (user.role === 'teamlead' ? 'Team Lead' : user.role || 'Team Lead'));
      setEditPhone(user.phone || '');
      setEditAvatarUrl(user.avatar || '');
    }
    setValidationError(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (!editName.trim()) {
      showError('Please enter your full name.');
      return;
    }
    if (!editEmail.trim() || !/\S+@\S+\.\S+/.test(editEmail.trim())) {
      showError('Please enter a valid email address.');
      return;
    }
    if (editPhone.trim() && !/^\d{10}$/.test(editPhone.trim())) {
      showError('Phone number must be exactly 10 digits.');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await updateUserProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        department: editDepartment.trim(),
        phone: editPhone.trim(),
        designation: editRole.trim(),
        avatar: editAvatarUrl || user?.avatar || '',
      });

      if (ok) {
        setIsEditing(false);
        showSuccess('Profile updated successfully.');
      } else {
        showError('Could not save your profile. Please try again.');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please choose a valid image file (JPG, JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Profile photo must be 5 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setEditAvatarUrl(base64);

      try {
        const ok = await updateUserProfile({ avatar: base64 });
        if (ok) {
          showSuccess('Profile photo updated successfully.');
        } else {
          showError('Could not save profile photo.');
        }
      } catch (err: any) {
        showError(err?.message || 'Failed to upload photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setEditAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const ok = await updateUserProfile({ avatar: '' });
      if (ok) {
        showSuccess('Profile photo removed.');
      } else {
        showError('Could not remove profile photo.');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to remove photo.');
    }
  };

  const displayAvatar = isEditing ? editAvatarUrl : user?.avatar || editAvatarUrl;
  const displayName = isEditing ? editName : user?.name || editName || 'User';
  const displayEmail = isEditing ? editEmail : user?.email || editEmail || '';
  const displayDepartment = isEditing ? editDepartment : user?.department || editDepartment || 'IT Support';
  const displayRole = isEditing ? editRole : user?.designation || (user?.role === 'teamlead' ? 'Team Lead' : user?.role || 'Team Lead');
  const displayPhone = isEditing ? editPhone : user?.phone || editPhone || '+1 (555) 000-0004';
  const displayId = user?.id || 'TL001';

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
                alt={displayName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center font-bold text-2xl shadow-2xs">
                {displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'TL'}
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
                {displayName}
              </h1>
              <BadgeCheck className="w-5 h-5 text-[#0284C7]" />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {displayRole} • {displayDepartment}
            </p>
            <div className="inline-flex items-center gap-3 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
                User ID: {displayId}
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
            User ID: {displayId}
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
                isLoading={isSaving}
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
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                  {displayName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> Employee ID
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono font-bold text-[#0284C7]">
                {displayId}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                  {displayEmail}
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
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                >
                  {DEPARTMENT_OPTIONS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                  {displayDepartment}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> System Role
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Enter role (e.g. Team Lead)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 inline-block">
                  {displayRole}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit phone number"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                  {displayPhone}
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
                size="sm"
                onClick={cancelEditing}
                className="border-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                icon={<Save className="w-4 h-4" />}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
