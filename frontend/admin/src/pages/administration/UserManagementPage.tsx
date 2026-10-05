import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { User } from '../../types';
import { AdminApiService } from '../../services/api';
import { UserPlus, Search, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await AdminApiService.getUsers();
      setUsers(data);
      setFilteredUsers(data);
      setIsLoading(false);
    }
    load();
  }, []);

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

  const columns: Column<User>[] = [
    {
      header: 'User & Email',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={row.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
          <div>
            <div className="font-semibold text-slate-900 text-[13px]">{row.name}</div>
            <div className="text-[12px] text-slate-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Department',
      accessorKey: 'department'
    },
    {
      header: 'Role',
      cell: (row) => {
        const variant = row.role === 'Admin' ? 'indigo' : row.role === 'Team Lead' ? 'info' : 'neutral';
        return <Badge variant={variant} className="text-[11px]">{row.role}</Badge>;
      }
    },
    {
      header: 'Status',
      cell: (row) => {
        const variant = row.status === 'Active' ? 'success' : row.status === 'Pending Invitation' ? 'warning' : 'neutral';
        return <Badge variant={variant} dot className="text-[11px]">{row.status}</Badge>;
      }
    },
    {
      header: 'Joined Date',
      accessorKey: 'createdAt'
    },
    {
      header: 'Actions',
      cell: () => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" icon={<Edit3 className="w-3.5 h-3.5" />} className="text-[12px]">
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />} className="text-[12px]">
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="text-[12px] py-0.5 px-2.5">Administration</Badge>
            <span className="text-[13px] text-slate-500">User Access Management</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-1 mb-0">User Management</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage system accounts, employee status, and team assignments.</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/add-user')}
          icon={<UserPlus className="w-4 h-4" />}
          className="text-[13px]"
        >
          Add New User
        </Button>
      </div>

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
    </div>
  );
};
