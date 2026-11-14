import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { TicketCategory, TicketPriority } from '../../types/ticket';
import { CATEGORIES, PRIORITIES } from '../../utils/constants';
import { X, PlusCircle, AlertCircle, CheckCircle2, Check, ExternalLink } from 'lucide-react';
import { AttachmentPicker, FileAttachmentItem } from '../common/AttachmentPicker';
import { TeamLeadEmployeeSelector } from './TeamLeadEmployeeSelector';
import { useAuth } from '../../hooks/useAuth';
import {
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
  'Development',
  'Other',
];

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // The form (and its data loading) is only mounted while the modal is open.
  // Rendering it unconditionally made every dashboard load fire the
  // directory/admin requests for a dialog nobody could see.
  if (!isOpen) return null;
  return <CreateTicketModalContent onClose={onClose} onSuccess={onSuccess} />;
};

const CreateTicketModalContent: React.FC<{
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}> = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createTicket } = useTickets();

  // Logged-in Team Lead Identity. Memoized so the picker does not treat a new
  // object identity as "a different user" on every parent render.
  const userDept = user?.department || 'IT Support';
  const currentTeamLead = useMemo(
    () => ({
      id: user?.id || '',
      employeeId: user?.id || '',
      name: user?.name || '',
      department: userDept,
      role: `${userDept} Team Lead`,
      email: user?.email || '',
    }),
    [user?.id, user?.name, userDept, user?.email],
  );

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Access Issue');
  const [customCategory, setCustomCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');

  // Department selection matching Admin screen - defaults to current team lead's department
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([userDept]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [selectedTeamLeadIds, setSelectedTeamLeadIds] = useState<string[]>([]);
  const [selectedTeamLeadObjs, setSelectedTeamLeadObjs] = useState<TeamLeadItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeObjs, setSelectedEmployeeObjs] = useState<EmployeeItem[]>([]);

  const toggleDepartment = (deptName: string) => {
    let next: string[];
    if (selectedDepartments.includes(deptName)) {
      if (selectedDepartments.length === 1) return; // Keep at least one department selected
      next = selectedDepartments.filter((d) => d !== deptName);
    } else {
      next = [...selectedDepartments, deptName];
    }
    setSelectedDepartments(next);
    setSelectedTeamLeadIds([]);
    setSelectedTeamLeadObjs([]);
    setSelectedEmployeeIds([]);
    setSelectedEmployeeObjs([]);
  };

  const isOtherDeptSelected = selectedDepartments.includes('Other');

  // Compute active department list and routing leads
  const activeDepartments = useMemo(
    () => selectedDepartments.map((dept) =>
      dept === 'Other' ? (customDepartment.trim() || 'Other Department') : dept
    ),
    [selectedDepartments, customDepartment]
  );

  const [fileAttachments, setFileAttachments] = useState<FileAttachmentItem[]>([]);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketData, setCreatedTicketData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      const finalDepartments = selectedDepartments.map((dept) =>
        dept === 'Other' ? (customDepartment.trim() || 'Other') : dept
      );
      const mainDepartmentStr = finalDepartments.join(' & ');

      const combinedTaggedMembers = [...selectedEmployeeObjs.map((emp) => ({
        id: emp.id,
        name: emp.name,
        department: emp.departmentName,
        avatar: '',
      }))];

      const assignedTarget =
        selectedEmployeeObjs.length > 0
          ? {
              assignedAgent: selectedEmployeeObjs[0].name,
              assignedAgentId: selectedEmployeeObjs[0].id,
              assignedToType: 'employee',
            }
          : selectedTeamLeadObjs.length > 0
          ? {
              assignedAgent: selectedTeamLeadObjs[0].name,
              assignedAgentId: selectedTeamLeadObjs[0].id,
              assignedToType: 'teamlead',
            }
          : {
              assignedAgent: 'Unassigned',
              assignedAgentId: undefined,
              assignedToType: 'unassigned',
            };

      const newTicket = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: finalCategory as TicketCategory,
        priority,
        department: mainDepartmentStr,
        departments: finalDepartments,
        assignedAgent: assignedTarget.assignedAgent,
        assignedAgentId: assignedTarget.assignedAgentId,
        assignedToType: assignedTarget.assignedToType as any,
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
        taggedMembers: combinedTaggedMembers,
        taggedMemberIds: combinedTaggedMembers.map(m => m.id),
        attachments: fileAttachments.map((f) => ({ name: f.name, size: f.size })),
        rawFiles: fileAttachments
          .map((f) => f.file)
          .filter((f): f is File => !!f),
      });

      setCreatedTicketData(newTicket);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(`Ticket ${newTicket.id} created successfully.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the ticket. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (createdTicketData) {
    const assignedPerson = createdTicketData.assignedAgent || createdTicketData.assigned_agent || (selectedEmployeeObjs.length > 0 ? selectedEmployeeObjs[0].name : (selectedTeamLeadObjs.length > 0 ? selectedTeamLeadObjs[0].name : 'Assigned Specialist'));
    const assignedRole = selectedEmployeeObjs.length > 0 ? 'Assigned Employee' : (selectedTeamLeadObjs.length > 0 ? 'Assigned Team Lead' : 'Assignee');

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div className="max-w-xl w-full mx-auto space-y-5 font-sans my-4 max-h-[92vh] overflow-y-auto">
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ticket Created Successfully</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your ticket has been registered in the system and routed to the assigned personnel.
              </p>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 text-left space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket ID</span>
                  <span className="text-sm font-mono font-bold text-sky-600">{createdTicketData.id || createdTicketData.ticketNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                    {priority}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{subject}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="text-xs font-semibold text-slate-800">{activeDepartments.join(', ') || userDept}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                  <span className="text-xs font-semibold text-slate-800">{category === 'Other' ? (customCategory.trim() || 'Other') : category}</span>
                </div>
              </div>

              {/* Assigned Person Highlight */}
              <div className="bg-sky-50/80 border border-sky-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">{assignedRole}</span>
                  <span className="text-xs font-bold text-slate-900">{assignedPerson}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Assigned
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/teamlead/assigned-tickets/${createdTicketData.id || createdTicketData.ticketNumber}`);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center justify-center"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Open Ticket Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <p className="text-xs text-slate-500">Route tickets within {userDept} team & assign to team members</p>
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
                onChange={(e) => {
                  const val = e.target.value as TicketCategory;
                  setCategory(val);
                  if (val !== 'Other') {
                    setCustomCategory('');
                  }
                }}
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
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
