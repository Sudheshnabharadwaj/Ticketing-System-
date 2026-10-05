import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Save, Lock, Key, UserCheck, AlertOctagon } from 'lucide-react';

export const SecuritySettingsPage: React.FC = () => {
  // A. Authentication
  const [minPasswordLength, setMinPasswordLength] = useState('8');
  const [passwordExpiry, setPasswordExpiry] = useState('90');
  const [loginAttemptLimit, setLoginAttemptLimit] = useState('5');

  // B. Session Security
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [rememberMe, setRememberMe] = useState(true);

  // C. Access Control
  const [roleBasedAccess, setRoleBasedAccess] = useState(true);
  const [deptBasedAccess, setDeptBasedAccess] = useState(true);
  const [teamLeadAccess, setTeamLeadAccess] = useState(true);
  const [employeeAccess, setEmployeeAccess] = useState(true);

  // D. Login Security
  const [accountLockout, setAccountLockout] = useState(true);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [suspiciousLoginAlerts, setSuspiciousLoginAlerts] = useState(true);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-snug">Security & Access</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Manage authentication, access controls and security policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* A. Authentication */}
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Key className="w-4 h-4 text-[#0284C7]" /> A. Authentication & Password Policy</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Minimum Password Length"
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(e.target.value)}
              options={[
                { value: '6', label: '6 Characters' },
                { value: '8', label: '8 Characters (Recommended)' },
                { value: '12', label: '12 Characters' },
                { value: '16', label: '16 Characters' },
              ]}
            />
            <Select
              label="Password Expiration"
              value={passwordExpiry}
              onChange={(e) => setPasswordExpiry(e.target.value)}
              options={[
                { value: '30', label: '30 Days' },
                { value: '60', label: '60 Days' },
                { value: '90', label: '90 Days (Recommended)' },
                { value: '0', label: 'Never Expire' },
              ]}
            />
            <Select
              label="Login Attempt Limit"
              value={loginAttemptLimit}
              onChange={(e) => setLoginAttemptLimit(e.target.value)}
              options={[
                { value: '3', label: '3 Attempts' },
                { value: '5', label: '5 Attempts (Standard)' },
                { value: '10', label: '10 Attempts' },
              ]}
            />
          </div>
        </Card>

        {/* B. Session Security */}
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Lock className="w-4 h-4 text-[#0284C7]" /> B. Session Security</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Session Timeout"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              options={[
                { value: '15', label: '15 Minutes' },
                { value: '30', label: '30 Minutes (Recommended)' },
                { value: '60', label: '60 Minutes' },
                { value: '120', label: '2 Hours' },
              ]}
            />

            <div className="flex flex-col justify-center space-y-3 pt-4 sm:pt-0">
              <label className="flex items-center gap-3 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                />
                Allow "Remember Me" persistent browser sessions
              </label>

              <button
                type="button"
                onClick={() => alert('All active sessions invalidated.')}
                className="text-xs text-red-600 hover:underline font-semibold text-left cursor-pointer"
              >
                Logout from all devices
              </button>
            </div>
          </div>
        </Card>

        {/* C. Access Control */}
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><UserCheck className="w-4 h-4 text-[#0284C7]" /> C. Access Control</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={roleBasedAccess}
                onChange={(e) => setRoleBasedAccess(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <span className="font-semibold text-slate-800">Role-based Access Control (RBAC)</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={deptBasedAccess}
                onChange={(e) => setDeptBasedAccess(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <span className="font-semibold text-slate-800">Department-based Access Boundaries</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={teamLeadAccess}
                onChange={(e) => setTeamLeadAccess(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <span className="font-semibold text-slate-800">Team Lead Administrative Scope</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={employeeAccess}
                onChange={(e) => setEmployeeAccess(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <span className="font-semibold text-slate-800">Employee Workspace Permissions</span>
            </label>
          </div>
        </Card>

        {/* D. Login Security */}
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-red-600" /> D. Login Security</span>}>
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={accountLockout}
                onChange={(e) => setAccountLockout(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Automatic Account Lockout</span>
                <span className="text-slate-500 text-[11px]">Lock account after reaching failed login attempt threshold</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={loginNotifications}
                onChange={(e) => setLoginNotifications(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <div>
                <span className="font-semibold text-slate-800 block">New Device Login Notifications</span>
                <span className="text-slate-500 text-[11px]">Send email alert on login from unknown browser or IP</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={suspiciousLoginAlerts}
                onChange={(e) => setSuspiciousLoginAlerts(e.target.checked)}
                className="rounded border-slate-300 text-[#0284C7]"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Suspicious Login Alerts</span>
                <span className="text-slate-500 text-[11px]">Flag rapid location changes or brute-force pattern detection</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Save Changes Button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600">
              ✓ Security policies updated successfully!
            </span>
          )}
          <div className="ml-auto">
            <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />} className="text-xs">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
