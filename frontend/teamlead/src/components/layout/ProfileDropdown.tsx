import React, { useState } from 'react';
import { ShieldCheck, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';
import { UserAvatar } from '../common/UserAvatar';

export const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navigateToProfile = () => {
    setIsOpen(false);
    navigate('/teamlead/profile');
  };

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
      >
        <UserAvatar name={user.name} avatar={user.avatar} size="lg" />
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
          <span className="inline-block text-[10px] font-medium text-sky-600 uppercase tracking-wider">
            Team Lead
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Team Lead Workspace
              </div>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                onClick={navigateToProfile}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-400" />
                Profile
              </button>

              <button
                onClick={navigateToProfile}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};
