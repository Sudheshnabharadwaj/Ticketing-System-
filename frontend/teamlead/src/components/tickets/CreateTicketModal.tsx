import React, { useState } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { TicketCategory, TicketPriority } from '../../types/ticket';
import { CATEGORIES, PRIORITIES } from '../../utils/constants';
import { X, PlusCircle, AlertCircle, Building2, CheckCircle2, Check } from 'lucide-react';
import { AttachmentPicker, FileAttachmentItem } from '../common/AttachmentPicker';
import { TeamLeadEmployeeSelector } from './TeamLeadEmployeeSelector';
import { useAuth } from '../../hooks/useAuth';
import {
  OrganizationService,
  type TeamLeadItem,
  type EmployeeItem,
} from '../../services/organizationService';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const DEPARTMENT_OPTIONS = [
  'IT Support',
  'Finance',
  'HR Operations',
  'Facilities',
  'General Administration',
  'Other',
];

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();
  const { createTicket } = useTickets();

  // Logged-in Team Lead Identity
  const currentTeamLead = {
    id: user?.id || 'OKL001',
    employeeId: user?.id || 'OKL001',
    name: user?.name || 'Kotesh Goud',
    department: user?.department || 'IT Support',
    role: `${user?.department || 'IT Support'} Team Lead`,
  };

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Access Issue');
  const [customCategory, setCustomCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');

  // Department selection matching Admin screen
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['IT Support']);
  const [customDepartment, setCustomDepartment] = useState('');
  const [selectedTeamLeadIds, setSelectedTeamLeadIds] = useState<string[]>([]);
  const [selectedTeamLeadObjs, setSelectedTeamLeadObjs] = useState<TeamLeadItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeObjs, setSelectedEmployeeObjs] = useState<EmployeeItem[]>([]);

  const toggleDepartment = (deptName: string) => {
    if (selectedDepartments.includes(deptName)) {
      if (selectedDepartments.length === 1) return; // Keep at least one department selected
      setSelectedDepartments(selectedDepartments.filter((d) => d !== deptName));
    } else {
      setSelectedDepartments([...selectedDepartments, deptName]);
    }
  };

  const isOtherDeptSelected = selectedDepartments.includes('Other');

  // Compute active department list and routing leads
  const activeDepartments = selectedDepartments.map((dept) =>
    dept === 'Other' ? (customDepartment.trim() || 'Other Department') : dept
  );

  const [fileAttachments, setFileAttachments] = useState<FileAttachmentItem[]>([]);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 17. VALIDATION
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (selectedDepartments.length === 0) {
      setError('Department is required');
      return;
    }
    if (isOtherDeptSelected && !customDepartment.trim()) {
      setError('Please specify the custom department name');
      return;
    }
    if (selectedTeamLeadIds.length === 0) {
      setError('Team Lead is required');
      return;
    }
    const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category;
    if (!finalCategory.trim()) {
      setError('Category is required');
      return;
    }
    if (!priority) {
      setError('Priority is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      const finalDepartments = selectedDepartments.map((dept) =>
        dept === 'Other' ? (customDepartment.trim() || 'Other') : dept
      );
      const mainDepartmentStr = finalDepartments.join(' & ');

      const newTicket = createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: finalCategory as TicketCategory,
        priority,
        department: mainDepartmentStr,
        departments: finalDepartments,
        teamLeads: selectedTeamLeadObjs.map((tl) => ({
          id: tl.id,
          employeeId: tl.employeeId,
          name: tl.name,
          role: tl.role,
          email: tl.email,
        })),
        teamLeadIds: selectedTeamLeadIds,
        taggedEmployees: selectedEmployeeObjs.map((emp) => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          role: emp.role,
          email: emp.email,
        })),
        employeeIds: selectedEmployeeIds,
        taggedMembers: selectedEmployeeObjs.map((emp) => ({
          id: emp.id,
          name: emp.name,
          department: emp.departmentName,
          avatar: '',
        })),
        taggedMemberIds: selectedEmployeeIds,
        attachments: fileAttachments.map((f) => ({ name: f.name, size: f.size })),
      });

      // 18. NOTIFICATION
      const successMsg = `Ticket created successfully. Email sent successfully.`;
      setSuccessToast(successMsg);

      if (onSuccess) {
        onSuccess(successMsg);
      }

      // Reset and close after brief toast feedback
      setTimeout(() => {
        setSubject('');
        setDescription('');
        setCategory('Access Issue');
        setCustomCategory('');
        setPriority('Medium');
        setSelectedEmployeeIds([]);
        setSelectedEmployeeObjs([]);
        setFileAttachments([]);
        setError('');
        setSuccessToast(null);
        onClose();
      }, 700);
    } catch {
      setError('Ticket created, but email notification failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-600 font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Create Support Ticket (Team Lead)</h2>
              <p className="text-xs text-slate-500">Route tickets within IT Support team & assign to team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {successToast && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successToast}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 font-sans">
          
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-normal"
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {category === 'Other' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type custom category..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department Selection (Multiple Departments Supported) */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Department Selection <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Select one or more departments
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEPARTMENT_OPTIONS.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#0284C7] border-[#0284C7] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{dept}</span>
                  </button>
                );
              })}
            </div>

            {/* Type Department custom field if "Other" selected */}
            {isOtherDeptSelected && (
              <div className="mt-3 pt-3 border-t border-slate-200/70">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type custom department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 text-slate-800"
                />
              </div>
            )}
          </div>

          {/* 10. TEAM LEAD & EMPLOYEE SELECTION COMPONENT */}
          <TeamLeadEmployeeSelector
            role="teamlead"
            currentUser={currentTeamLead}
            selectedDepartments={activeDepartments}
            selectedTeamLeadIds={selectedTeamLeadIds}
            selectedEmployeeIds={selectedEmployeeIds}
            onSelectedTeamLeadsChange={(ids, objs) => {
              setSelectedTeamLeadIds(ids);
              setSelectedTeamLeadObjs(objs);
            }}
            onSelectedEmployeesChange={(ids, objs) => {
              setSelectedEmployeeIds(ids);
              setSelectedEmployeeObjs(objs);
            }}
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue or request..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 resize-none font-normal"
            />
          </div>

          {/* Native Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attachments (Optional)</label>
            <AttachmentPicker
              attachments={fileAttachments}
              onChange={setFileAttachments}
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
