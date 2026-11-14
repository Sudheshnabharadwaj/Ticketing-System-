import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import type { User, UserDepartment, UserRole, UserStatus } from '../../types';
import { AdminApiService } from '../../services/api';
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  Mail,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>(() => AdminApiService.getCachedUsers() || []);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(() => AdminApiService.getCachedUsers() || []);
  const [isLoading, setIsLoading] = useState(() => !AdminApiService.getCachedUsers() || AdminApiService.getCachedUsers()!.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customEditDepartment, setCustomEditDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    department: UserDepartment;
    role: UserRole;
    status: UserStatus;
  }>({
    name: '',
    email: '',
    department: 'IT Support',
    role: 'Employee',
    status: 'Active',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete User Modal State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async (force = false, showToast = false) => {
    if (force) {
      setIsRefreshing(true);
      AdminApiService.invalidateCache();
    } else if (!AdminApiService.getCachedUsers() || AdminApiService.getCachedUsers()!.length === 0) {
      setIsLoading(true);
    }
    try {
      const userData = await AdminApiService.getUsers(force);
      setUsers(userData);
      setFilteredUsers(userData);
      if (showToast) {
        setToastMessage({ text: `Refreshed ${userData.length} users from database.`, type: 'success' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true, false);
    const handleUpdate = () => {
      loadData(true, false);
    };
    window.addEventListener('ticket-updated', handleUpdate);
    window.addEventListener('user-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ticket-updated', handleUpdate);
      window.removeEventListener('user-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role.toLowerCase() === roleFilter.toLowerCase());
    }
    setFilteredUsers(result);
  }, [search, roleFilter, users]);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    const standardDepts = ['IT Support', 'HR', 'Finance', 'Development', 'QA Team'];
    const isStandard = standardDepts.includes(user.department);
    setEditFormData({
      name: user.name,
      email: user.email,
      department: (isStandard ? user.department : 'Other') as UserDepartment,
      role: user.role,
      status: user.status,
    });
    setCustomEditDepartment(isStandard ? '' : user.department);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    const finalDepartment = editFormData.department === 'Other'
      ? (customEditDepartment.trim() || 'Other')
      : editFormData.department;
    try {
      await AdminApiService.updateUser(editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        department: finalDepartment,
        role: editFormData.role,
        status: editFormData.status,
      });

      setUsers(prev =>
        prev.map(u =>
          u.id === editingUser.id
            ? {
                ...u,
                name: editFormData.name,
                email: editFormData.email,
                department: finalDepartment as UserDepartment,
                role: editFormData.role,
                status: editFormData.status,
              }
            : u
        )
      );

      setEditingUser(null);
      setToastMessage({ text: `User ${editFormData.name} updated successfully!`, type: 'success' });
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to update user', type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await AdminApiService.deleteUser(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setToastMessage({ text: `User ${deletingUser.name} deleted successfully!`, type: 'success' });
      setDeletingUser(null);
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to delete user', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendInvite = async (user: User) => {
    try {
      const res = await AdminApiService.resendInvite(user);
      if (res && (res.status === 'success' || res.success)) {
        setToastMessage({ text: `Invitation re-sent successfully to ${user.email}!`, type: 'success' });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'Pending Invitation' } : u));
      } else {
        setToastMessage({ text: res?.message || 'Could not send invite. Verify SMTP notification settings.', type: 'error' });
      }
    } catch (e: any) {
      setToastMessage({ text: 'Unable to deliver invitation email. Please verify SMTP setup.', type: 'error' });
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'USER & EMAIL',
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt={row.name}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-sky-100 text-[#0284C7] font-bold text-xs flex items-center justify-center ring-1 ring-sky-200 shrink-0">
              {(row.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900 text-[13px]">{row.name}</div>
            <div className="text-[12px] text-slate-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'DEPARTMENT',
      cell: (row) => (
        <span className="text-[13px] text-slate-700 font-normal">{row.department}</span>
      )
    },
    {
      header: 'ROLE',
      cell: (row) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-[#0284C7] border border-sky-100">
          {row.role}
        </span>
      )
    },
    {
      header: 'STATUS',
      cell: (row) => {
        if (row.status === 'Active') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active
            </span>
          );
        }
        if (row.status === 'Pending Invitation') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Invitation sent, awaiting activation">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Pending Invitation
            </span>
          );
        }
        if (row.status === 'Invite Expired') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200" title="Invitation link expired after 7 days">
              <Clock className="w-3 h-3 text-orange-500" />
              Invite Expired
            </span>
          );
        }
        if (row.status === 'Invite Failed') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200" title="Invitation email delivery failed">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              Invite Failed
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'JOINED DATE',
      cell: (row) => (
        <span className="text-[13px] text-slate-600 font-normal">{row.createdAt}</span>
      )
    },
    {
      header: 'ACTIONS',
      cell: (row) => (
        <div className="flex items-center gap-3">
          {['Pending Invitation', 'Invite Expired', 'Invite Failed'].includes(row.status) && (
            <button
              type="button"
              onClick={() => handleResendInvite(row)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] cursor-pointer transition-colors"
              title="Resend invitation email"
            >
              <Mail className="w-3.5 h-3.5 text-[#0284C7]" />
              Resend
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeletingUser(row)}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header matching Picture 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">
              Administration
            </span>
            <span className="text-xs text-slate-500">User Access Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 mb-0">User Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system accounts, employee status, and team assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => loadData(true, true)}
            disabled={isRefreshing}
            icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/admin/add-user')}
            icon={<UserPlus className="w-4 h-4" />}
            className="bg-[#0284C7] hover:bg-[#0274B3] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            Add New User
          </Button>
        </div>
      </div>

      {/* Search and Filter Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'team lead', label: 'Team Lead' },
                { value: 'employee', label: 'Employee' },
              ]}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredUsers} keyExtractor={(row) => row.id} isLoading={isLoading} compact />
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title="Edit User Details"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
              <select
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value as UserDepartment })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] bg-white"
              >
                <option value="IT Support">IT Support</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Development">Development</option>
                <option value="QA Team">QA Team</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {editFormData.department === 'Other' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Specify Department Name *</label>
                <input
                  type="text"
                  required
                  value={customEditDepartment}
                  onChange={(e) => setCustomEditDepartment(e.target.value)}
                  placeholder="Enter custom department"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Role</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] bg-white"
              >
                <option value="Active">Active</option>
                <option value="Pending Invitation">Pending Invitation</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSavingEdit}
                className="bg-[#0284C7] text-white"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingUser(null)}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete user <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.email})?
              This will permanently revoke their access and remove their account record.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
