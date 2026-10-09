import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { User } from '../../types';
import { AdminApiService } from '../../services/api';
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Mail,
  Key,
  Info,
  RefreshCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, smtp] = await Promise.all([
        AdminApiService.getUsers(),
        AdminApiService.getSmtpStatus()
      ]);
      setUsers(userData);
      setFilteredUsers(userData);
      setSmtpStatus(smtp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleCopyLink = (row: User) => {
    const roleNorm = (row.role || 'employee').toLowerCase().replace(' ', '');
    const token = row.inviteToken || '';
    const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '');
    const url = `${baseUrl}/#/signup?token=${token}&email=${encodeURIComponent(row.email)}&role=${roleNorm}`;
    navigator.clipboard.writeText(url);
    setCopiedId(row.id);
    setActionMessage({ text: `✓ Verification link copied for ${row.name} (${row.email})!`, type: 'success' });
    setTimeout(() => {
      setCopiedId(null);
      setActionMessage(null);
    }, 4000);
  };

  const handleResendInvite = async (row: User) => {
    setActionLoadingId(row.id);
    try {
      const res = await AdminApiService.resendInvite({
        name: row.name,
        email: row.email,
        employeeId: row.employeeId || row.id,
        role: row.role,
        department: row.department,
        inviteToken: row.inviteToken
      });
      if (res.smtp_sent) {
        setActionMessage({ text: `✓ Live invitation email delivered to ${row.email}!`, type: 'success' });
      } else {
        setActionMessage({
          text: `ℹ️ Verification link generated for ${row.email}. (Token: ${res.invite_token || row.inviteToken || 'Ready'}). You can copy the link below.`,
          type: 'info'
        });
      }
      await loadData();
    } catch {
      setActionMessage({ text: `Failed to resend invite for ${row.email}.`, type: 'error' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleActivateUser = async (row: User) => {
    if (!confirm(`Are you sure you want to manually activate ${row.name} (${row.email})? This bypasses invitation verification and enables immediate login.`)) {
      return;
    }
    setActionLoadingId(row.id);
    try {
      await AdminApiService.manuallyActivateUser(row.id);
      setActionMessage({ text: `✓ User ${row.name} (${row.email}) is now Active and can sign in!`, type: 'success' });
      await loadData();
    } catch {
      setActionMessage({ text: `Failed to activate ${row.name}.`, type: 'error' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

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
            <div className="text-[12px] text-slate-500 font-mono">{row.email}</div>
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
      header: 'Status & Verification',
      cell: (row) => {
        const variant = row.status === 'Active' ? 'success' : row.status === 'Pending Invitation' ? 'warning' : 'neutral';
        return (
          <div className="space-y-1">
            <Badge variant={variant} dot className="text-[11px]">{row.status}</Badge>
            {row.status === 'Pending Invitation' && row.inviteToken && (
              <div className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                Token: {row.inviteToken}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Joined Date',
      accessorKey: 'createdAt'
    },
    {
      header: 'Actions & Verifications',
      cell: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.status === 'Pending Invitation' ? (
            <>
              <button
                type="button"
                onClick={() => handleCopyLink(row)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                title="Copy direct verification signup link"
              >
                {copiedId === row.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedId === row.id ? 'Copied' : 'Copy Link'}
              </button>

              <button
                type="button"
                disabled={actionLoadingId === row.id}
                onClick={() => handleResendInvite(row)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer disabled:opacity-50"
                title="Resend verification email"
              >
                <Send className="w-3 h-3" />
                Resend
              </button>

              <button
                type="button"
                disabled={actionLoadingId === row.id}
                onClick={() => handleActivateUser(row)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer disabled:opacity-50"
                title="Bypass invitation and activate immediately"
              >
                <ShieldCheck className="w-3 h-3" />
                Activate
              </button>
            </>
          ) : (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </span>
          )}
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
            <span className="text-[13px] text-slate-500">User Access & Verification Management</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-1 mb-0">User Management</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage system accounts, send and track email verifications, and activate employees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className="w-4 h-4" />}
            className="text-[13px]"
          >
            Refresh
          </Button>
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
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : actionMessage.type === 'info'
            ? 'bg-sky-50 border-sky-200 text-sky-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <Info className="w-4 h-4 shrink-0" />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* SMTP Delivery Diagnostics Card */}
      {smtpStatus && !smtpStatus.is_configured && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block">
                Live Gmail SMTP Email Delivery Requires App Password
              </span>
              <span className="text-amber-700 leading-relaxed block mt-0.5">
                Configured sender: <strong>{smtpStatus.sender_email || 'kotesh1720@gmail.com'}</strong>. For live emails to reach inboxes, set a 16-character Google App Password in <code>backend/.env</code>.
                In the meantime, verification tokens and direct onboarding links can be copied or resent using the buttons below!
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/administration/settings')}
            className="shrink-0 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            Go to Settings
          </Button>
        </div>
      )}

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
