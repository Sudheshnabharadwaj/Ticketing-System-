import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Settings, Save, Globe, Bell, Shield, Server, Mail, Key, Check, Send, AlertTriangle, Info } from 'lucide-react';
import { AdminApiService } from '../../services/api';

export const AdminSettingsPage: React.FC = () => {
  const [portalName, setPortalName] = useState('Ticketing Portal');
  const [supportEmail, setSupportEmail] = useState('support@company.com');
  const [timezone, setTimezone] = useState('UTC-5');
  const [language, setLanguage] = useState('en-US');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  // SMTP State
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('kotesh1720@gmail.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Kotesh');
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('kotesh1720@gmail.com');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  useEffect(() => {
    async function loadSmtp() {
      try {
        const res = await AdminApiService.getSmtpStatus();
        setSmtpStatus(res);
        if (res.host) setSmtpHost(res.host);
        if (res.port) setSmtpPort(String(res.port));
        if (res.sender_email) setSmtpUser(res.sender_email);
        if (res.sender_name) setSmtpFromName(res.sender_name);
      } catch (e) {
        console.error('Could not load SMTP status:', e);
      }
    }
    loadSmtp();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    try {
      if (smtpUser || smtpPassword) {
        const updated = await AdminApiService.updateSmtpConfig({
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort, 10) || 465,
          smtp_user: smtpUser.trim(),
          smtp_password: smtpPassword.trim() || undefined,
          smtp_from_email: smtpUser.trim(),
          smtp_from_name: smtpFromName.trim(),
          smtp_tls: false
        });
        setSmtpStatus(updated);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Could not save settings. Please verify backend connectivity.');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail.trim()) {
      setTestResult('Please enter a recipient test email address.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await AdminApiService.testSmtp(testEmail.trim());
      if (res.success) {
        setTestResult(`✓ Test email delivered successfully to ${testEmail}!`);
      } else {
        const reason = res.details?.reason || res.details?.error || 'SMTP delivery failed.';
        setTestResult(`⚠️ ${reason}`);
      }
    } catch {
      setTestResult('⚠️ Could not connect to backend notification service.');
    } finally {
      setIsTesting(false);
    }
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
          Configure general system preferences, SMTP email delivery, portal branding, and administrative controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMTP & Verification Emails Card */}
        <Card title={<span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2"><Mail className="w-4 h-4 text-[#0284C7]" /> Email & Verification Provider (SMTP)</span>}>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">SMTP Provider Status:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                  smtpStatus?.is_configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {smtpStatus?.is_configured ? 'Live Ready' : 'App Password Required'}
                </span>
              </div>
              <p className="text-slate-600">
                To send live verification and invitation emails to Gmail inboxes, generate a 16-character Google App Password at{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0284C7] underline font-medium"
                >
                  https://myaccount.google.com/apppasswords
                </a>{' '}
                and enter it below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sender Email / Gmail Username *"
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="e.g. kotesh1720@gmail.com"
              />
              <Input
                label="Google 16-Char App Password *"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                helperText={smtpStatus?.has_password ? "Password currently set in backend/.env" : "Enter App Password to enable live inbox delivery"}
              />
              <Input
                label="Sender Display Name"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="e.g. Kotesh / Ticketing Platform"
              />
              <Input
                label="SMTP Host & Port"
                value={`${smtpHost}:${smtpPort}`}
                disabled
                helperText="Google SSL/TLS default (smtp.gmail.com:465)"
              />
            </div>

            {/* Test Email Delivery Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Test Live Email Delivery</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTesting}
                  onClick={handleTestSmtp}
                  className="text-xs font-semibold"
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  {isTesting ? 'Sending Test...' : 'Send Test Email'}
                </Button>
              </div>
              {testResult && (
                <div className={`p-2 rounded text-xs font-medium ${
                  testResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>
        </Card>

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
              ✓ Admin & SMTP settings saved successfully!
            </span>
          )}
          <div className="ml-auto">
            <Button
              variant="primary"
              type="submit"
              disabled={isSavingSmtp}
              icon={<Save className="w-4 h-4" />}
              className="text-[13px]"
            >
              {isSavingSmtp ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
