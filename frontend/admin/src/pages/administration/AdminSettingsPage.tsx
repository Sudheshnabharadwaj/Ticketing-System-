import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Settings, Save, Globe, Bell, Shield, Server } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [portalName, setPortalName] = useState('Ticketing Portal');
  const [supportEmail, setSupportEmail] = useState('support@company.com');
  const [timezone, setTimezone] = useState('UTC-5');
  const [language, setLanguage] = useState('en-US');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0284C7] border border-blue-200">
            System Administration
          </span>
        </div>
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-1 mb-0">Admin Settings</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Configure general system preferences, portal branding, and administrative controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Settings className="w-4 h-4 text-[#0284C7]" /> Portal Information</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Portal Branding Name"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
            />
            <Input
              label="System Support Email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
        </Card>

        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-[#0284C7]" /> Regional & Localization</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Default Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'UTC-8', label: 'Pacific Time (US & Canada)' },
                { value: 'UTC-5', label: 'Eastern Time (US & Canada)' },
                { value: 'UTC+0', label: 'Greenwich Mean Time (GMT)' },
                { value: 'UTC+1', label: 'Central European Time (CET)' },
                { value: 'UTC+5:30', label: 'Indian Standard Time (IST)' },
              ]}
            />
            <Select
              label="Default Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en-US', label: 'English (US)' },
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'es-ES', label: 'Spanish' },
                { value: 'fr-FR', label: 'French' },
                { value: 'de-DE', label: 'German' },
              ]}
            />
          </div>
        </Card>

        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Server className="w-4 h-4 text-[#0284C7]" /> Maintenance & System Status</span>}>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
              />
              <div>
                <span className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" /> Enable Maintenance Mode
                </span>
                <p className="text-[12px] text-slate-600 mt-0.5">
                  Restricts portal access exclusively to Super Administrators during scheduled system updates.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
              />
              <div>
                <span className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[#0284C7]" /> Global Admin System Email Notifications
                </span>
                <p className="text-[12px] text-slate-600 mt-0.5">
                  Receive immediate email summaries for system health events and critical security alerts.
                </p>
              </div>
            </label>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-[13px] font-semibold text-emerald-600">
              ✓ Admin settings saved successfully!
            </span>
          )}
          <div className="ml-auto">
            <Button variant="primary" type="submit" icon={<Save className="w-4 h-4" />} className="text-[13px]">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
