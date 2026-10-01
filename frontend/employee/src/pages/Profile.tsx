import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Building, Phone, BadgeCheck, Camera, Upload, Trash2, Edit3, Save, X } from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import type { EmployeeProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = EmployeeService.getProfile();
    setProfile(p);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditDepartment(p.department);
    setEditRole(p.role);
    setEditPhone(p.phone);
    setEditAvatarUrl(p.avatarUrl || '');
  }, []);

  if (!profile) return null;

  const startEditing = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditDepartment(profile.department);
    setEditRole(profile.role);
    setEditPhone(profile.phone);
    setEditAvatarUrl(profile.avatarUrl || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = EmployeeService.updateProfile({
      name: editName.trim() || profile.name,
      email: editEmail.trim() || profile.email,
      department: editDepartment.trim() || profile.department,
      role: editRole.trim() || profile.role,
      phone: editPhone.trim() || profile.phone,
      avatarUrl: editAvatarUrl,
    });
    setProfile(updated);
    setIsEditing(false);
    // Notify top nav and other listeners
    window.dispatchEvent(new Event('storage'));
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
          const updated = EmployeeService.updateProfile({ avatarUrl: result });
          setProfile(updated);
          setEditAvatarUrl(result);
        }
        setShowImageModal(false);
        window.dispatchEvent(new Event('storage'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    if (isEditing) {
      setEditAvatarUrl(imageUrlInput.trim());
    } else {
      const updated = EmployeeService.updateProfile({ avatarUrl: imageUrlInput.trim() });
      setProfile(updated);
      setEditAvatarUrl(imageUrlInput.trim());
    }
    setImageUrlInput('');
    setShowImageModal(false);
    window.dispatchEvent(new Event('storage'));
  };

  const handleRemoveImage = () => {
    if (isEditing) {
      setEditAvatarUrl('');
    } else {
      const updated = EmployeeService.updateProfile({ avatarUrl: '' });
      setProfile(updated);
      setEditAvatarUrl('');
    }
    setShowImageModal(false);
    window.dispatchEvent(new Event('storage'));
  };

  const displayAvatar = isEditing ? editAvatarUrl : profile.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-12">
      {/* Hidden File Input for Direct Local Image Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Clean Profile Header Card */}
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
                  .join('')}
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
            <div className="inline-flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo from Computer
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#0284C7]">
            ID: {profile.employeeId}
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
                    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
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
                  placeholder="Enter role (e.g. Senior IT Specialist)"
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
                  {profile.phone}
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
          </div>
        )}
      </form>
    </div>
  );
};
