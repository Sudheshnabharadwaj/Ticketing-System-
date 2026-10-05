import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Plus,
  Save,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface StatusConfigItem {
  id: string;
  name: string;
  description: string;
  color: string;
  enabled: boolean;
}

interface CategoryConfigItem {
  id: string;
  name: string;
  subCategories: string[];
  enabled: boolean;
}

export const TicketConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fields' | 'status' | 'priority' | 'categories' | 'general'>('fields');

  // 1. Ticket Fields State
  const [fields, setFields] = useState([
    { id: 'f-1', name: 'Subject', type: 'Text Input', required: true, system: true },
    { id: 'f-2', name: 'Description', type: 'Text Area', required: true, system: true },
    { id: 'f-3', name: 'Department', type: 'Dropdown', required: true, system: true },
    { id: 'f-4', name: 'Category', type: 'Dropdown', required: true, system: true },
    { id: 'f-5', name: 'Sub-category', type: 'Dropdown', required: false, system: false },
    { id: 'f-6', name: 'Priority', type: 'Dropdown', required: true, system: true },
    { id: 'f-7', name: 'Attachments', type: 'File Upload', required: false, system: false },
  ]);

  // 2. Status Configuration State
  const [statuses, setStatuses] = useState<StatusConfigItem[]>([
    { id: 's-1', name: 'Open', description: 'New ticket awaiting triage', color: 'blue', enabled: true },
    { id: 's-2', name: 'In Progress', description: 'Ticket actively being resolved', color: 'sky', enabled: true },
    { id: 's-3', name: 'Pending', description: 'Awaiting customer or 3rd party response', color: 'amber', enabled: true },
    { id: 's-4', name: 'Resolved', description: 'Fix provided, awaiting verification', color: 'emerald', enabled: true },
    { id: 's-5', name: 'Closed', description: 'Archived and finalized ticket', color: 'slate', enabled: true },
  ]);

  // 3. Priority Configuration State
  const [priorities] = useState([
    { id: 'p-1', name: 'Low', responseTarget: '8 Hours', resolutionTarget: '48 Hours', color: 'slate' },
    { id: 'p-2', name: 'Medium', responseTarget: '4 Hours', resolutionTarget: '24 Hours', color: 'blue' },
    { id: 'p-3', name: 'High', responseTarget: '2 Hours', resolutionTarget: '8 Hours', color: 'amber' },
    { id: 'p-4', name: 'Critical', responseTarget: '30 Mins', resolutionTarget: '4 Hours', color: 'red' },
  ]);

  // 4. Category Configuration State
  const [categories, setCategories] = useState<CategoryConfigItem[]>([
    { id: 'c-1', name: 'Software Issue', subCategories: ['Bug Report', 'License Request', 'Installation Error'], enabled: true },
    { id: 'c-2', name: 'Hardware Issue', subCategories: ['Laptop Repair', 'Monitor Replacement', 'Peripherals'], enabled: true },
    { id: 'c-3', name: 'Access Request', subCategories: ['VPN Access', 'Database Permission', 'SSO Login'], enabled: true },
    { id: 'c-4', name: 'Network Issue', subCategories: ['Wi-Fi Disconnect', 'Firewall Block', 'Slow Bandwidth'], enabled: true },
    { id: 'c-5', name: 'Email Issue', subCategories: ['Spam Filter', 'Outlook Sync', 'Distribution List'], enabled: true },
    { id: 'c-6', name: 'HR Request', subCategories: ['Payroll Inquiry', 'Leave Policy', 'Benefits Enrollment'], enabled: true },
    { id: 'c-7', name: 'Finance Request', subCategories: ['Expense Reimbursement', 'Vendor Invoice', 'Tax Form'], enabled: true },
  ]);

  // 5. General Settings State
  const [idPrefix, setIdPrefix] = useState('TICK-');
  const [autoGen, setAutoGen] = useState(true);
  const [startingNum, setStartingNum] = useState('1001');

  // Modals for add/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'status' | 'category' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemSub, setNewItemSub] = useState('');

  const toggleStatus = (id: string) => {
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const toggleCategory = (id: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    if (modalType === 'status') {
      setStatuses([
        ...statuses,
        {
          id: `s-${Date.now()}`,
          name: newItemName.trim(),
          description: newItemDesc.trim() || 'Custom ticket status state',
          color: 'blue',
          enabled: true
        }
      ]);
    } else if (modalType === 'category') {
      const subs = newItemSub ? newItemSub.split(',').map(s => s.trim()).filter(Boolean) : ['General Inquiry'];
      setCategories([
        ...categories,
        {
          id: `c-${Date.now()}`,
          name: newItemName.trim(),
          subCategories: subs,
          enabled: true
        }
      ]);
    }
    setIsModalOpen(false);
    setNewItemName('');
    setNewItemDesc('');
    setNewItemSub('');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-snug">Ticket Configuration</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Configure ticket fields, statuses, priorities and categories.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('fields')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'fields'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          1. Ticket Fields
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'status'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          2. Status Configuration
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'priority'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          3. Priority Configuration
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          4. Category Configuration
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'general'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          5. Ticket Number & General
        </button>
      </div>

      {/* TAB 1: TICKET FIELDS */}
      {activeTab === 'fields' && (
        <Card title="System Ticket Fields" subtitle="Fields collected during ticket submission and editing">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Field Name</th>
                  <th className="py-2.5 px-3">Input Type</th>
                  <th className="py-2.5 px-3">Required</th>
                  <th className="py-2.5 px-3">Field Type</th>
                  <th className="py-2.5 px-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-slate-900">{f.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{f.type}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${f.required ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                        {f.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{f.system ? 'Core System Field' : 'Custom Field'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setFields(prev => prev.map(item => item.id === f.id ? { ...item, required: !item.required } : item))}
                        className="text-xs text-[#0284C7] hover:underline font-medium cursor-pointer"
                      >
                        Toggle Required
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: STATUS CONFIGURATION */}
      {activeTab === 'status' && (
        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <span>Status Configuration</span>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => { setModalType('status'); setIsModalOpen(true); }}
                className="text-xs"
              >
                Add Status
              </Button>
            </div>
          }
          subtitle="Configure system status states and life cycle stages"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {statuses.map((s) => (
              <div key={s.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant={s.name === 'Resolved' ? 'success' : s.name === 'Pending' ? 'warning' : 'info'}>
                      {s.name}
                    </Badge>
                    <button
                      onClick={() => toggleStatus(s.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                      {s.enabled ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                  <p className="text-slate-600 mt-2 font-normal text-[11.5px]">{s.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10.5px] font-bold ${s.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {s.enabled ? 'Active State' : 'Disabled'}
                  </span>
                  <button className="text-[11px] text-slate-500 hover:text-[#0284C7] font-medium cursor-pointer">
                    Edit Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: PRIORITY CONFIGURATION */}
      {activeTab === 'priority' && (
        <Card title="Priority Configuration" subtitle="Define severity levels and resolution response targets">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Priority Level</th>
                  <th className="py-2.5 px-3">Response SLA Target</th>
                  <th className="py-2.5 px-3">Resolution SLA Target</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorities.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <Badge variant={p.name === 'Critical' ? 'danger' : p.name === 'High' ? 'warning' : 'neutral'} dot>
                        {p.name}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-800">{p.responseTarget}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-800">{p.resolutionTarget}</td>
                    <td className="py-3 px-3 text-right">
                      <button className="text-xs text-[#0284C7] hover:underline font-medium cursor-pointer">
                        Edit SLA Targets
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: CATEGORY CONFIGURATION */}
      {activeTab === 'categories' && (
        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <span>Category & Sub-category Configuration</span>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => { setModalType('category'); setIsModalOpen(true); }}
                className="text-xs"
              >
                Add Category
              </Button>
            </div>
          }
          subtitle="Manage issue classifications and nested sub-categories"
        >
          <div className="space-y-3 text-xs">
            {categories.map((c) => (
              <div key={c.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                    <Badge variant={c.enabled ? 'success' : 'neutral'} className="text-[10px]">
                      {c.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.subCategories.map((sub, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleCategory(c.id)}
                    className="px-2.5 py-1 text-xs border rounded-md font-medium cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    {c.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium cursor-pointer">
                    Edit Sub-categories
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 5: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <Card title="Ticket ID & General Settings" subtitle="Automated ticketing numbering rules and default fields">
          <div className="space-y-4 max-w-xl text-xs">
            <Input
              label="Ticket ID Prefix Format"
              value={idPrefix}
              onChange={(e) => setIdPrefix(e.target.value)}
              helperText="E.g., TICK- generates TICK-1001, TICK-1002"
            />

            <Input
              label="Auto-Increment Starting Number"
              value={startingNum}
              onChange={(e) => setStartingNum(e.target.value)}
            />

            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={autoGen}
                onChange={(e) => setAutoGen(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0284C7]"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Enable Auto-generated Ticket ID</span>
                <span className="text-slate-500 text-[11px]">Automatically assign sequential IDs upon submission</span>
              </div>
            </label>

            <div className="pt-3 border-t border-slate-100">
              <Button variant="primary" size="sm" icon={<Save className="w-3.5 h-3.5" />}>
                Save Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ADD MODAL */}
      {isModalOpen && modalType && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={modalType === 'status' ? 'Add New Status' : 'Add New Category'}
        >
          <div className="space-y-4 text-xs">
            <Input
              label={modalType === 'status' ? 'Status Name *' : 'Category Name *'}
              placeholder={modalType === 'status' ? 'e.g. In Review' : 'e.g. Database Support'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />

            {modalType === 'status' ? (
              <Input
                label="Description"
                placeholder="Brief description of when this status applies"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
              />
            ) : (
              <Input
                label="Sub-categories (Comma separated)"
                placeholder="e.g. DB Backup, Query Tuning, Connection Leak"
                value={newItemSub}
                onChange={(e) => setNewItemSub(e.target.value)}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddItem}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
