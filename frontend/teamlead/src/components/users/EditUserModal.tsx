import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole, UserStatus } from '../../types/user';
import { X, Save, AlertCircle } from 'lucide-react';

interface EditUserModalProps {
  userToEdit: User | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ userToEdit, onClose, onSuccess }) => {
  if (!userToEdit) return null;

  const { updateUser } = useAuth();

  const [name, setName] = useState(userToEdit.name);
  const [email, setEmail] = useState(userToEdit.email);
  const [phone, setPhone] = useState(userToEdit.phone || '');
  const [department, setDepartment] = useState(userToEdit.department || '');
  const [role, setRole] = useState<UserRole>(userToEdit.role);
  const [status, setStatus] = useState<UserStatus>(userToEdit.status);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    setName(userToEdit.name);
    setEmail(userToEdit.email);
    setPhone(userToEdit.phone || '');
    setDepartment(userToEdit.department || '');
    setRole(userToEdit.role);
    setStatus(userToEdit.status);
  }, [userToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    if (!name.trim()) {
      setErrors({ name: 'Name is required.' });
      return;
    }
    if (!email.trim()) {
      setErrors({ email: 'Email is required.' });
      return;
    }
    if (phone && phone.trim().length > 0 && phone.trim().length !== 10) {
      setErrors({ phone: 'Phone number must be exactly 10 digits.' });
      return;
    }

    const res = updateUser(userToEdit.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      department: department.trim() || undefined,
      role,
      status,
    });

    if (!res.success) {
      setGlobalError(res.error || 'Failed to update employee.');
      return;
    }

    if (onSuccess) {
      onSuccess(`Employee ${name.trim()} updated successfully.`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Employee: {userToEdit.name}</h2>
            <p className="text-xs font-mono text-sky-600">{userToEdit.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {globalError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800"
              />
              {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800"
              />
              {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                  errors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">System Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="employee">Employee</option>
                <option value="teamlead">Team Lead</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
