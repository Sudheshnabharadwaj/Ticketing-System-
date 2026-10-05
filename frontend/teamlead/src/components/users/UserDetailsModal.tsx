import React from 'react';
import { User } from '../../types/user';
import { X, Mail, Phone, Building, MapPin, ShieldCheck, UserCheck } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface UserDetailsModalProps {
  user: User | null;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-sky-500 to-sky-700 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/40 text-white hover:bg-slate-900/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute -bottom-8 left-6">
            <UserAvatar name={user.name} avatar={user.avatar} size="xl" className="border-4 border-white shadow-md" />
          </div>
        </div>

        <div className="pt-12 p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  user.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {user.status}
              </span>
            </div>
            <p className="text-xs font-mono font-semibold text-sky-600 mt-0.5">{user.id}</p>
            {user.designation && <p className="text-xs text-slate-500 font-medium">{user.designation}</p>}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{user.email}</span>
            </div>

            {user.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{user.department || 'N/A'} {user.team ? `(${user.team})` : ''}</span>
            </div>

            {user.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{user.location}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="font-semibold capitalize">{user.role === 'teamlead' ? 'Team Lead' : 'Employee'} Access</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
