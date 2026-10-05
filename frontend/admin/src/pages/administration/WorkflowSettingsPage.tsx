import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  ArrowRight,
  Plus,
  CheckCircle2,
  Layers,
  ShieldAlert,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface RuleItem {
  id: string;
  name: string;
  type: 'assignment' | 'transition' | 'escalation';
  details: string;
  enabled: boolean;
}

export const WorkflowSettingsPage: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([
    { id: 'r-1', name: 'IT Support Auto-Assignment', type: 'assignment', details: 'Auto-assign IT tickets to IT Lead Alex Rivera upon submission', enabled: true },
    { id: 'r-2', name: 'HR Department Routing', type: 'assignment', details: 'Route HR category submissions to HR Lead David Vance', enabled: true },
    { id: 'r-3', name: 'Open to In Progress Transition', type: 'transition', details: 'Automatically set status to In Progress when Lead opens ticket', enabled: true },
    { id: 'r-4', name: 'Pending Wait Handler', type: 'transition', details: 'Allow In Progress ↔ Pending back-and-forth transitions', enabled: true },
    { id: 'r-5', name: 'SLA Risk Lead Alert', type: 'escalation', details: 'Trigger email & notification to Team Lead when SLA reaches 75%', enabled: true },
    { id: 'r-6', name: 'SLA Breached Admin Escalation', type: 'escalation', details: 'Reassign to Admin & set priority Urgent if resolution time breaches', enabled: true },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<'assignment' | 'transition' | 'escalation'>('assignment');
  const [ruleDetails, setRuleDetails] = useState('');

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleAddRule = () => {
    if (!ruleName.trim()) return;
    setRules([
      ...rules,
      {
        id: `r-${Date.now()}`,
        name: ruleName.trim(),
        type: ruleType,
        details: ruleDetails.trim() || 'Custom workflow rule',
        enabled: true
      }
    ]);
    setIsModalOpen(false);
    setRuleName('');
    setRuleDetails('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-snug">Workflow Settings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Define ticket routing, assignment and status transitions.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsModalOpen(true)}
          className="text-xs"
        >
          Add Rule
        </Button>
      </div>

      {/* Simple Workflow Flow Diagram */}
      <Card title={<span className="text-[16px] font-semibold text-slate-900">Standard Ticket Lifecycle Workflow</span>}>
        <div className="py-3 px-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700">
          <div className="px-3.5 py-2 bg-slate-100 rounded-lg border border-slate-200 text-center">
            Employee Creates Ticket
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-blue-50 text-[#0284C7] rounded-lg border border-blue-200 text-center font-bold">
            Open
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-slate-100 rounded-lg border border-slate-200 text-center">
            Team Lead Assignment
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-sky-50 text-sky-700 rounded-lg border border-sky-200 text-center font-bold">
            In Progress
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-center font-bold">
            Pending / Waiting
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 text-center font-bold">
            Resolved
          </div>
          <ArrowRight className="w-4 h-4 text-[#0284C7]" />

          <div className="px-3.5 py-2 bg-slate-800 text-white rounded-lg text-center">
            Closed
          </div>
        </div>
      </Card>

      {/* A. Assignment Rules */}
      <Card
        title={
          <span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0284C7]" /> A. Assignment Rules
          </span>
        }
        subtitle="Automatic routing by Department, Team Lead, Employee, and Auto assignment"
      >
        <div className="space-y-2 text-xs">
          {rules.filter(r => r.type === 'assignment').map((r) => (
            <div key={r.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 hover:bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-slate-500 mt-0.5">{r.details}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Active' : 'Disabled'}</Badge>
                <button onClick={() => toggleRule(r.id)} className="cursor-pointer">
                  {r.enabled ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* B. Status Transitions */}
      <Card
        title={
          <span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0284C7]" /> B. Status Transitions
          </span>
        }
        subtitle="Allowed lifecycle transitions (Open → In Progress → Pending → Resolved → Closed)"
      >
        <div className="space-y-2 text-xs">
          {rules.filter(r => r.type === 'transition').map((r) => (
            <div key={r.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 hover:bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-slate-500 mt-0.5">{r.details}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Active' : 'Disabled'}</Badge>
                <button onClick={() => toggleRule(r.id)} className="cursor-pointer">
                  {r.enabled ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* C. Escalation Rules */}
      <Card
        title={
          <span className="text-[16px] font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" /> C. Escalation Rules
          </span>
        }
        subtitle="Triggers for SLA Risk, SLA Breached, Escalate to Team Lead, and Escalate to Admin"
      >
        <div className="space-y-2 text-xs">
          {rules.filter(r => r.type === 'escalation').map((r) => (
            <div key={r.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 hover:bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-slate-500 mt-0.5">{r.details}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={r.enabled ? 'danger' : 'neutral'}>{r.enabled ? 'Active Trigger' : 'Disabled'}</Badge>
                <button onClick={() => toggleRule(r.id)} className="cursor-pointer">
                  {r.enabled ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* D. Add / Edit Rule Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Add Workflow Rule"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Rule Name *"
              placeholder="e.g. High Priority Auto-Escalate"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
            />

            <Select
              label="Rule Section / Category *"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as any)}
              options={[
                { value: 'assignment', label: 'Assignment Rule' },
                { value: 'transition', label: 'Status Transition' },
                { value: 'escalation', label: 'Escalation Rule' },
              ]}
            />

            <Input
              label="Rule Action / Conditions"
              placeholder="e.g. Reassign to Admin when SLA reaches 90%"
              value={ruleDetails}
              onChange={(e) => setRuleDetails(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddRule}>
                Save Rule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
