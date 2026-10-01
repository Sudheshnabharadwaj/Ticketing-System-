import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const RolesPermissionsPage: React.FC = () => {
  const roles = [
    {
      name: 'Admin',
      users: 4,
      description: 'Unrestricted full administrative access to all tickets, configurations, and users.',
      permissions: ['Manage Users', 'Manage Tickets', 'Configure Workflows', 'View Analytics', 'System Security']
    },
    {
      name: 'Team Lead',
      users: 12,
      description: 'Departmental supervisor role with ticket escalation re-assignment privileges.',
      permissions: ['Manage Tickets', 'View Analytics', 'Department Workflows']
    },
    {
      name: 'Employee',
      users: 120,
      description: 'Standard end-user role capable of submitting tickets and viewing own ticket history.',
      permissions: ['Create Tickets', 'View Own Tickets']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="indigo" className="text-[12px] py-0.5 px-2.5">Administration</Badge>
          <span className="text-[13px] text-slate-500">Access Control Matrix</span>
        </div>
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-1 mb-0">Roles & Permissions</h1>
        <p className="text-[13px] text-slate-500 mt-1">Define security clearance levels and feature flags per user role.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((r) => (
          <Card key={r.name} title={<span className="text-[16px] font-semibold text-slate-900">{r.name}</span>} subtitle={`${r.users} Assigned Users`} action={<Button variant="outline" size="sm" className="text-[12px]">Edit Matrix</Button>}>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{r.description}</p>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Enabled Capabilities</span>
              <div className="flex flex-wrap gap-2">
                {r.permissions.map((p) => (
                  <Badge key={p} variant="indigo" dot className="text-[11.5px] py-0.5 px-2">{p}</Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
