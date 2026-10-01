import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types/user';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { AddUserModal } from '../../components/users/AddUserModal';
import { EditUserModal } from '../../components/users/EditUserModal';
import { UserDetailsModal } from '../../components/users/UserDetailsModal';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  UserPlus,
  Users,
  Eye,
  Edit,
  Power,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  MoreVertical
} from 'lucide-react';

export const Employees: React.FC = () => {
  const { users, toggleUserStatus, deleteUser } = useAuth();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Get unique departments for filter dropdown
  const departmentsList = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  ) as string[];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.toLowerCase().includes(search.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = departmentFilter === 'All' || u.department === departmentFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleToggleStatus = (u: User) => {
    toggleUserStatus(u.id);
    const nextStatus = u.status === 'Active' ? 'Deactivated' : 'Activated';
    showToast(`Employee ${u.name} (${u.id}) has been ${nextStatus}.`);
    setMenuUserId(null);
  };

  const ConfirmDeleteDialog = () => {
    if (!deletingUser) return null;

    return (
      <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
        <div className="bg-white p-5 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-150">
          <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Confirm User Deletion</span>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Are you sure you want to delete <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.id})? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2 text-xs">
            <button
              onClick={() => setDeletingUser(null)}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteUser(deletingUser.id);
                showToast(`Employee ${deletingUser.name} deleted.`);
                setDeletingUser(null);
              }}
              className="px-4 py-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
            >
              Delete Employee
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 w-full max-w-full min-w-0">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full max-w-full">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Employee Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage corporate employee accounts, system roles, departments, and status.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          + Add User
        </button>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 w-full max-w-full min-w-0">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by Employee ID, Name, Email, Phone, or Department..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden md:inline">Filters:</span>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departmentsList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="No user accounts match your search or filter criteria."
          icon={<Users className="w-8 h-8 text-sky-600" />}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
          <div className="w-full max-w-full overflow-x-auto lg:overflow-x-visible">
            <table className="w-full text-left border-collapse table-fixed max-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-3 w-[10%]">Employee ID</th>
                  <th className="py-2 px-3 w-[20%]">Name</th>
                  <th className="py-2 px-3 w-[24%]">Email</th>
                  <th className="py-2 px-3 w-[14%]">Department</th>
                  <th className="py-2 px-3 w-[11%]">Role</th>
                  <th className="py-2 px-3 w-[9%]">Status</th>
                  <th className="py-2 px-3 w-[12%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono font-semibold text-xs text-sky-600 truncate min-w-0">{u.id}</td>

                    <td className="py-2 px-3 text-xs truncate min-w-0">
                      <div className="flex items-center space-x-2 truncate">
                        <UserAvatar name={u.name} avatar={u.avatar} size="xs" />
                        <span className="font-semibold text-slate-900 truncate" title={u.name}>{u.name}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-xs text-slate-600 truncate min-w-0" title={u.email}>{u.email}</td>

                    <td className="py-2 px-3 text-xs text-slate-700 truncate min-w-0">{u.department || 'N/A'}</td>

                    <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          u.role === 'teamlead'
                            ? 'bg-sky-100 text-sky-700 border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.role === 'teamlead' ? 'Team Lead' : 'Employee'}
                      </span>
                    </td>

                    <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          u.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                        {u.status}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right whitespace-nowrap relative min-w-0">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* Primary Action: View */}
                        <button
                          onClick={() => setViewingUser(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>

                        {/* Secondary Actions 3-Dot Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuUserId(menuUserId === u.id ? null : u.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {menuUserId === u.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setMenuUserId(null)} />
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-30 py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setMenuUserId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-sky-600 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`w-full px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                                    u.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                  <span>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingUser(u);
                                    setMenuUserId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={showToast}
      />

      {/* Edit User Modal */}
      <EditUserModal
        userToEdit={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={showToast}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        user={viewingUser}
        onClose={() => setViewingUser(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog />
    </div>
  );
};
