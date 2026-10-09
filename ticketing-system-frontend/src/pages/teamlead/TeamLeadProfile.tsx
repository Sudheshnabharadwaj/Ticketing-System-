import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/common/UserAvatar';
import { User, Mail, Phone, Building, MapPin, Shield, CheckCircle2, Save, Camera, X, Trash2, Image as ImageIcon } from 'lucide-react';

export const TeamLeadProfile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    department: user.department || '',
    team: user.team || '',
    location: user.location || '',
  });

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string>(user.avatar || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPG, JPEG, PNG, WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    updateUserProfile({ avatar: previewAvatar });
    setIsPhotoModalOpen(false);
    showToast('Profile picture updated successfully.');
  };

  const handleRemovePhoto = () => {
    setPreviewAvatar('');
    updateUserProfile({ avatar: '' });
    setIsPhotoModalOpen(false);
    showToast('Profile picture removed successfully.');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone && formData.phone.length > 0 && formData.phone.length !== 10) {
      showToast('Phone number must be exactly 10 digits.');
      return;
    }

    updateUserProfile(formData);
    setSavedSuccess(true);
    showToast('Profile updated successfully.');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Team Lead Profile Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your contact information, profile picture, department assignments, and ITSM preferences.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-sky-600 to-sky-800 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="relative group">
              <UserAvatar
                name={user.name}
                avatar={user.avatar}
                size="xl"
                className="!w-24 !h-24 border-4 border-white shadow-md font-bold text-3xl"
              />
              <button
                type="button"
                onClick={() => {
                  setPreviewAvatar(user.avatar || '');
                  setIsPhotoModalOpen(true);
                }}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-md border-2 border-white transition-all cursor-pointer hover:scale-105"
                title="Change Profile Picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-14 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAvatar(user.avatar || '');
                    setIsPhotoModalOpen(true);
                  }}
                  className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Change Photo
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            </div>
            <span className="px-3 py-1 bg-sky-100 text-sky-700 font-bold text-xs rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0 self-start sm:self-auto">
              <Shield className="w-3.5 h-3.5" /> Team Lead
            </span>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    maxLength={10}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Team</label>
                <input
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg"
              >
                <Save className="w-4 h-4" /> Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* Photo Edit Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Update Profile Picture</h3>
              <p className="text-xs text-slate-500 mb-5">
                Upload a professional photo (JPG, JPEG, PNG, WEBP).
              </p>

              {/* Photo Preview Circle */}
              <div className="relative mb-6">
                <UserAvatar
                  name={user.name}
                  avatar={previewAvatar}
                  size="xl"
                  className="!w-28 !h-28 border-4 border-sky-100 shadow-md font-bold text-4xl"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Change Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="w-full py-2 px-4 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Photo</span>
                </button>

                <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePhoto}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
