import React, { useEffect } from 'react';
import { UserCheck, X, Check, ShieldCheck } from 'lucide-react';

export interface TeamLeadOption {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
}

export const TEAM_LEADS_REGISTRY: Record<string, TeamLeadOption[]> = {
  'IT Support': [
    { id: 'tl-it-1', name: 'Sarah Connor', role: 'IT Support Team Lead', department: 'IT Support', email: 'sarah.connor@company.com' },
    { id: 'tl-it-2', name: 'Alex Rivera', role: 'IT Infrastructure Lead', department: 'IT Support', email: 'alex.rivera@company.com' },
  ],
  'Finance': [
    { id: 'tl-fin-1', name: 'David Miller', role: 'Finance Team Lead', department: 'Finance', email: 'david.miller@company.com' },
    { id: 'tl-fin-2', name: 'Rachel Green', role: 'Payroll Lead', department: 'Finance', email: 'rachel.green@company.com' },
  ],
  'HR Operations': [
    { id: 'tl-hr-1', name: 'Adi', role: 'HR Operations Team Lead', department: 'HR Operations', email: 'adi.hr@company.com' },
    { id: 'tl-hr-2', name: 'Kotesh', role: 'Talent Acquisition Lead', department: 'HR Operations', email: 'kotesh.hr@company.com' },
  ],
  'Facilities': [
    { id: 'tl-fac-1', name: 'Mounika', role: 'Facilities Team Lead', department: 'Facilities', email: 'mounika.fac@company.com' },
    { id: 'tl-fac-2', name: 'Marcus Vance', role: 'Workplace Operations Lead', department: 'Facilities', email: 'marcus.vance@company.com' },
  ],
  'General Administration': [
    { id: 'tl-adm-1', name: 'Sudha', role: 'General Admin Team Lead', department: 'General Administration', email: 'sudha.admin@company.com' },
    { id: 'tl-adm-2', name: 'Elena Rostova', role: 'Corporate Admin Lead', department: 'General Administration', email: 'elena.rostova@company.com' },
  ],
};

export function getAvailableTeamLeadsForDepartments(departments: string[]): TeamLeadOption[] {
  const leads: TeamLeadOption[] = [];

  departments.forEach((dept) => {
    const norm = dept.trim();
    if (TEAM_LEADS_REGISTRY[norm]) {
      leads.push(...TEAM_LEADS_REGISTRY[norm]);
    } else {
      // Dynamic lead for custom / unlisted departments
      const customId = `tl-custom-${norm.toLowerCase().replace(/\s+/g, '-')}`;
      leads.push({
        id: customId,
        name: `${norm} Team Lead`,
        role: `${norm} Lead`,
        department: norm,
        email: `lead.${norm.toLowerCase().replace(/\s+/g, '')}@company.com`,
      });
    }
  });

  return leads;
}

interface TeamLeadSelectorProps {
  selectedDepartments: string[];
  selectedTeamLeadIds: string[];
  onSelectedTeamLeadsChange: (teamLeadIds: string[], selectedLeadsObj: TeamLeadOption[]) => void;
}

export const TeamLeadSelector: React.FC<TeamLeadSelectorProps> = ({
  selectedDepartments,
  selectedTeamLeadIds,
  onSelectedTeamLeadsChange,
}) => {
  const availableLeads = getAvailableTeamLeadsForDepartments(selectedDepartments);

  // Auto-select primary team lead for each selected department if none selected
  useEffect(() => {
    if (availableLeads.length > 0 && selectedTeamLeadIds.length === 0) {
      // Pick first lead per department by default
      const defaultIds: string[] = [];
      const seenDepts = new Set<string>();

      availableLeads.forEach((lead) => {
        if (!seenDepts.has(lead.department)) {
          seenDepts.add(lead.department);
          defaultIds.push(lead.id);
        }
      });

      const selectedObjs = availableLeads.filter((l) => defaultIds.includes(l.id));
      onSelectedTeamLeadsChange(defaultIds, selectedObjs);
    }
  }, [selectedDepartments]);

  const toggleLead = (lead: TeamLeadOption) => {
    let updatedIds: string[];
    if (selectedTeamLeadIds.includes(lead.id)) {
      if (selectedTeamLeadIds.length === 1) return; // Keep at least 1 lead
      updatedIds = selectedTeamLeadIds.filter((id) => id !== lead.id);
    } else {
      updatedIds = [...selectedTeamLeadIds, lead.id];
    }
    const updatedObjs = availableLeads.filter((l) => updatedIds.includes(l.id));
    onSelectedTeamLeadsChange(updatedIds, updatedObjs);
  };

  const removeLead = (leadId: string) => {
    if (selectedTeamLeadIds.length === 1) return;
    const updatedIds = selectedTeamLeadIds.filter((id) => id !== leadId);
    const updatedObjs = availableLeads.filter((l) => updatedIds.includes(l.id));
    onSelectedTeamLeadsChange(updatedIds, updatedObjs);
  };

  const selectedLeadsObjects = availableLeads.filter((l) => selectedTeamLeadIds.includes(l.id));

  // Group available leads by department
  const leadsByDept: Record<string, TeamLeadOption[]> = {};
  availableLeads.forEach((l) => {
    if (!leadsByDept[l.department]) leadsByDept[l.department] = [];
    leadsByDept[l.department].push(l);
  });

  return (
    <div className="space-y-3 font-sans bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-[#0284C7]" />
          Team Lead Selection
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          Tag team leads responsible for routing
        </span>
      </div>

      {/* Selected Team Leads Chips/Tags */}
      {selectedLeadsObjects.length > 0 && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Assigned Team Leads:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedLeadsObjects.map((lead) => (
              <span
                key={lead.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200/80 shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>
                  {lead.name} — <span className="font-mono text-[11px] text-slate-600">{lead.department} Team Lead</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeLead(lead.id)}
                  className="hover:text-red-600 hover:bg-sky-100/70 p-0.5 rounded-full cursor-pointer transition-colors ml-0.5"
                  title="Remove lead"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available Team Leads grouped by department with Checkboxes */}
      <div className="space-y-2.5 pt-1">
        {Object.entries(leadsByDept).map(([dept, leads]) => (
          <div key={dept} className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-2">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">
              {dept} Available Team Leads
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {leads.map((lead) => {
                const isChecked = selectedTeamLeadIds.includes(lead.id);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => toggleLead(lead)}
                    className={`flex items-center gap-2.5 p-2 px-3 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-sky-50/70 border-[#0284C7] text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-[#0284C7] border-[#0284C7] text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{lead.name}</div>
                      <div className="text-[10.5px] text-slate-500 font-medium truncate">{lead.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
