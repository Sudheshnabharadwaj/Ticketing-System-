import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  X,
  Check,
  Search,
  Users,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';
import {
  OrganizationService,
  type TeamLeadItem,
  type EmployeeItem,
} from '../../services/organizationService';

export interface TeamLeadEmployeeSelectorProps {
  role?: 'admin' | 'teamlead' | 'employee';
  currentUser?: {
    id?: string;
    employeeId?: string;
    name?: string;
    department?: string;
    role?: string;
  };
  selectedDepartments: string[];
  selectedTeamLeadIds: string[];
  selectedEmployeeIds: string[];
  onSelectedTeamLeadsChange: (ids: string[], leadObjs: TeamLeadItem[]) => void;
  onSelectedEmployeesChange: (ids: string[], empObjs: EmployeeItem[]) => void;
  className?: string;
}

export const TeamLeadEmployeeSelector: React.FC<TeamLeadEmployeeSelectorProps> = ({
  role = 'admin',
  currentUser,
  selectedDepartments,
  selectedTeamLeadIds,
  selectedEmployeeIds,
  onSelectedTeamLeadsChange,
  onSelectedEmployeesChange,
  className = '',
}) => {
  const [, setDbVersion] = useState(0);

  useEffect(() => {
    OrganizationService.syncFromDatabase().then(() => {
      setDbVersion((v) => v + 1);
    });
  }, []);

  // Search state stored per Team Lead ID to allow independent search fields
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  const handleSearchChange = (teamLeadId: string, query: string) => {
    setSearchQueries((prev) => ({
      ...prev,
      [teamLeadId]: query,
    }));
  };

  // Search state stored per department for Team Lead search
  const [teamLeadSearchQueries, setTeamLeadSearchQueries] = useState<Record<string, string>>({});

  const handleTeamLeadSearchChange = (deptName: string, query: string) => {
    setTeamLeadSearchQueries((prev) => ({
      ...prev,
      [deptName]: query,
    }));
  };

  // Determine departments to render based on role
  const effectiveDepartments =
    role === 'teamlead'
      ? [currentUser?.department || 'IT Support']
      : selectedDepartments;

  // Toggle selection of a Team Lead
  const handleToggleLead = (lead: TeamLeadItem) => {
    let updatedIds: string[];
    if (selectedTeamLeadIds.includes(lead.id)) {
      updatedIds = selectedTeamLeadIds.filter((id) => id !== lead.id);
      // Remove any employees belonging to this deselected Team Lead
      const teamEmployees = OrganizationService.getEmployeesByTeamLead(lead.id);
      const teamEmpIds = new Set(teamEmployees.map((e) => e.id));
      const updatedEmpIds = selectedEmployeeIds.filter((id) => !teamEmpIds.has(id));
      const updatedEmpObjs = updatedEmpIds
        .map((id) => OrganizationService.getEmployeeById(id))
        .filter((e): e is EmployeeItem => !!e);
      onSelectedEmployeesChange(updatedEmpIds, updatedEmpObjs);
    } else {
      updatedIds = [...selectedTeamLeadIds, lead.id];
    }

    const updatedLeadObjs = updatedIds
      .map((id) => OrganizationService.getTeamLeadById(id))
      .filter((l): l is TeamLeadItem => !!l);

    onSelectedTeamLeadsChange(updatedIds, updatedLeadObjs);
  };

  // Toggle tagging of an Employee
  const handleToggleEmployee = (employee: EmployeeItem) => {
    let updatedEmpIds: string[];
    if (selectedEmployeeIds.includes(employee.id)) {
      updatedEmpIds = selectedEmployeeIds.filter((id) => id !== employee.id);
    } else {
      updatedEmpIds = [...selectedEmployeeIds, employee.id];
    }

    const updatedEmpObjs = updatedEmpIds
      .map((id) => OrganizationService.getEmployeeById(id))
      .filter((e): e is EmployeeItem => !!e);

    onSelectedEmployeesChange(updatedEmpIds, updatedEmpObjs);
  };

  // Remove tagged employee from chip
  const handleRemoveEmployeeTag = (employeeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedEmpIds = selectedEmployeeIds.filter((id) => id !== employeeId);
    const updatedEmpObjs = updatedEmpIds
      .map((id) => OrganizationService.getEmployeeById(id))
      .filter((emp): emp is EmployeeItem => !!emp);
    onSelectedEmployeesChange(updatedEmpIds, updatedEmpObjs);
  };

  // Fetch all currently tagged Employee objects
  const taggedEmployees = selectedEmployeeIds
    .map((id) => OrganizationService.getEmployeeById(id))
    .filter((emp): emp is EmployeeItem => !!emp);

  return (
    <div
      className={`space-y-4 font-sans bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-[#0284C7]" />
          Team Lead & Employee Assignment
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          Select Team Lead and tag team members
        </span>
      </div>

      {/* 6. EMPLOYEE TAGGING - Selected Employees Chips */}
      {taggedEmployees.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0284C7]" />
              Selected Employees ({taggedEmployees.length}):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {taggedEmployees.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200 shadow-2xs transition-all animate-in fade-in duration-150"
              >
                <span>
                  {emp.name} — <span className="font-mono text-[11px] font-bold">{emp.employeeId}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveEmployeeTag(emp.id, e)}
                  className="hover:text-red-600 hover:bg-sky-100/70 p-0.5 rounded-full cursor-pointer transition-colors ml-0.5"
                  title={`Remove ${emp.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Departments & Team Leads Iteration */}
      {effectiveDepartments.length === 0 ? (
        <div className="text-center py-3 text-xs text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
          Please select a department above to view Team Leads.
        </div>
      ) : (
        <div className="space-y-3.5">
          {effectiveDepartments.map((deptName) => {
            const availableLeads = OrganizationService.getTeamLeadsByDepartment(deptName);

            // For Team Lead role, filter to own identity
            const leadsToDisplay =
              role === 'teamlead'
                ? availableLeads.filter(
                    (l) =>
                      l.id === currentUser?.id ||
                      l.employeeId === currentUser?.employeeId ||
                      l.name === currentUser?.name
                  )
                : availableLeads;

          const tlQuery = (teamLeadSearchQueries[deptName] || '').trim().toLowerCase();
          const filteredLeads = leadsToDisplay.filter((lead) => {
            if (!tlQuery) return true;
            return (
              lead.name.toLowerCase().includes(tlQuery) ||
              lead.employeeId.toLowerCase().includes(tlQuery)
            );
          });

          return (
            <div
              key={deptName}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3"
            >
              {/* Department Section Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                  {deptName} Team Leads
                </span>
                <span className="text-[10.5px] font-medium text-slate-400">
                  {leadsToDisplay.length} Available Lead{leadsToDisplay.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* 1. TEAM LEAD SEARCH */}
              {role !== 'teamlead' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={teamLeadSearchQueries[deptName] || ''}
                    onChange={(e) => handleTeamLeadSearchChange(deptName, e.target.value)}
                    placeholder="Search Team Lead by name or Employee ID"
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-[#0284C7] focus:bg-white focus:ring-1 focus:ring-[#0284C7]/20 transition-all"
                  />
                  {teamLeadSearchQueries[deptName] && (
                    <button
                      type="button"
                      onClick={() => handleTeamLeadSearchChange(deptName, '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {filteredLeads.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2 text-center bg-slate-50/80 rounded-lg border border-slate-200/60">
                  No Team Leads found.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 3. TEAM LEAD SELECTION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredLeads.map((lead) => {
                        const isSelected = selectedTeamLeadIds.includes(lead.id);

                        return (
                          <div
                            key={lead.id}
                            onClick={() => {
                              // If teamlead role, it is locked to own identity
                              if (role !== 'teamlead') {
                                handleToggleLead(lead);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-sky-50/70 border-[#0284C7] text-slate-900 shadow-2xs ring-1 ring-[#0284C7]/20'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/60'
                            }`}
                          >
                            {/* Checkbox indicator */}
                            <div
                              className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#0284C7] border-[#0284C7] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {lead.name}
                                </span>
                                {role === 'teamlead' && (
                                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 font-mono">
                                Employee ID: <span className="text-slate-800">{lead.employeeId}</span>
                              </div>
                              <div className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                                {lead.role}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 4 & 7. AFTER SELECTING TEAM LEAD - Display that Team Lead's employees separately */}
                    {leadsToDisplay
                      .filter((lead) => selectedTeamLeadIds.includes(lead.id))
                      .map((lead) => {
                        const searchQuery = searchQueries[lead.id] || '';
                        const filteredEmployees = OrganizationService.searchEmployees(
                          lead.id,
                          searchQuery
                        );

                        return (
                          <div
                            key={`team-section-${lead.id}`}
                            className="bg-slate-50/90 rounded-xl border border-sky-200/80 p-3 space-y-2.5 mt-2 transition-all animate-in fade-in duration-200"
                          >
                            {/* Selected Team Lead Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/70 pb-2">
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <BadgeCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                                  <span>{lead.name}</span>
                                  <span className="font-mono text-slate-500 font-semibold">
                                    — {lead.employeeId}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Team Members ({filteredEmployees.length})
                                </div>
                              </div>

                              {/* 5. EMPLOYEE SEARCH FIELD */}
                              <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) =>
                                    handleSearchChange(lead.id, e.target.value)
                                  }
                                  placeholder="Search employee by name or Employee ID"
                                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 transition-all"
                                />
                                {searchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => handleSearchChange(lead.id, '')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Employees Grid */}
                            {filteredEmployees.length === 0 ? (
                              <div className="text-xs text-slate-500 italic py-2 text-center bg-white/70 rounded-lg border border-slate-200/60">
                                No employees found.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {filteredEmployees.map((emp) => {
                                  const isEmpSelected = selectedEmployeeIds.includes(emp.id);

                                  return (
                                    <div
                                      key={emp.id}
                                      onClick={() => handleToggleEmployee(emp)}
                                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                        isEmpSelected
                                          ? 'bg-sky-50/90 border-[#0284C7] text-slate-900 shadow-2xs font-semibold'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="min-w-0 flex items-center gap-2">
                                        {/* Checkbox */}
                                        <div
                                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            isEmpSelected
                                              ? 'bg-[#0284C7] border-[#0284C7] text-white'
                                              : 'border-slate-300 bg-white'
                                          }`}
                                        >
                                          {isEmpSelected && (
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          )}
                                        </div>

                                        <div className="truncate">
                                          <div className="text-xs truncate">
                                            <span className="font-bold text-slate-900">
                                              {emp.name}
                                            </span>
                                            <span className="font-mono text-slate-500 text-[11px] ml-1 font-semibold">
                                              — {emp.employeeId}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-normal truncate">
                                            {emp.role}
                                          </div>
                                        </div>
                                      </div>

                                      {isEmpSelected && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleRemoveEmployeeTag(emp.id, e)}
                                          className="p-1 hover:bg-sky-100 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                                          title="Remove tag"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
