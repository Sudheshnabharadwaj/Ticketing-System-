import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, AlertCircle, Check, CheckCircle2, X } from 'lucide-react';
import { AdminApiService } from '../../services/api';
import { OrganizationService, type TeamLeadItem, type EmployeeItem } from '../../services/organizationService';
import type { TicketPriority } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { AttachmentFilePicker, type AttachedFile } from '../../components/ui/AttachmentFilePicker';
import { TeamLeadEmployeeSelector } from '../../components/ui/TeamLeadEmployeeSelector';

const DEFAULT_DEPARTMENT_OPTIONS = [
  'IT Support',
  'Finance',
  'HR',
  'Facilities',
  'General Administration',
  'Other',
];

export const AdminCreateTicketPage: React.FC = () => {
  const navigate = useNavigate();

  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hardware & Devices');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['IT Support']);
  const [customDepartment, setCustomDepartment] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedTeamLeadIds, setSelectedTeamLeadIds] = useState<string[]>([]);
  const [selectedTeamLeadObjs, setSelectedTeamLeadObjs] = useState<TeamLeadItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeObjs, setSelectedEmployeeObjs] = useState<EmployeeItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    OrganizationService.syncFromDatabase().then(() => {
      const depts = OrganizationService.getDepartments();
      if (depts && depts.length > 0) {
        setDepartmentOptions(depts.map((d) => d.name));
      }
    });
  }, []);

  const toggleDepartment = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      if (selectedDepartments.length === 1) return;
      setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const isOtherDeptSelected = selectedDepartments.includes('Other');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!subject.trim()) {
      setValidationError('Subject is required');
      return;
    }
    if (selectedDepartments.length === 0) {
      setValidationError('Department is required');
      return;
    }
    const deptLeads = selectedDepartments.flatMap((d) => OrganizationService.getTeamLeadsByDepartment(d));
    if (deptLeads.length > 0 && selectedTeamLeadIds.length === 0) {
      setValidationError('Team Lead is required');
      return;
    }
    const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category;
    if (!finalCategory.trim()) {
      setValidationError('Category is required');
      return;
    }
    if (!priority) {
      setValidationError('Priority is required');
      return;
    }
    if (!description.trim()) {
      setValidationError('Description is required');
      return;
    }

    const finalDepartments = selectedDepartments.map((dept) =>
      dept === 'Other' ? (customDepartment.trim() || 'Other') : dept
    );
    const mainDepartmentStr = finalDepartments.join(' & ');
    const attachmentStrings = attachedFiles.map((f) => `${f.name} (${f.size})`);

    setIsSubmitting(true);
    try {
      await AdminApiService.createTicket({
        title: subject.trim(),
        category: finalCategory,
        department: mainDepartmentStr,
        departments: finalDepartments,
        priority,
        description: description.trim(),
        attachments: attachmentStrings,
        rawFiles: attachedFiles.map((f) => f.file).filter(Boolean) as File[],
        teamLeads: selectedTeamLeadObjs.map((tl) => ({
          id: tl.id,
          employeeId: tl.employeeId,
          name: tl.name,
          role: tl.role,
          email: tl.email,
        })),
        employees: selectedEmployeeObjs.map((emp) => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          role: emp.role,
          email: emp.email,
        })),
      });

      setSuccessToast('Ticket created successfully!');
      setTimeout(() => {
        navigate('/admin/workspace/my-tickets');
      }, 1500);
    } catch (err: any) {
      setValidationError(err?.message || 'Could not create ticket. Please check your selections and try again.');
      setIsSubmitting(false);
    }
  };

  const activeDepartments = selectedDepartments.map((dept) =>
    dept === 'Other' ? (customDepartment.trim() || 'Other') : dept
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-[#0284C7] font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Create Support Ticket (Admin)</h2>
              <p className="text-xs text-slate-500">Route tickets within teams & assign to team leads or members</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/workspace/my-tickets')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successToast && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {validationError && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 font-sans">
          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Brief summary of the issue or request..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Department Selection */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Department Selection <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Select one or more departments
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {departmentOptions.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`flex items-center gap-2 p-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
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

            {isOtherDeptSelected && (
              <div className="mt-3 pt-3 border-t border-slate-200/70">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type Department <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Type custom department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Team Lead & Employee Assignment */}
          <TeamLeadEmployeeSelector
            role="admin"
            selectedDepartments={activeDepartments}
            selectedTeamLeadIds={selectedTeamLeadIds}
            selectedEmployeeIds={selectedEmployeeIds}
            onSelectedTeamLeadsChange={(ids: string[], objs: TeamLeadItem[]) => {
              setSelectedTeamLeadIds(ids);
              setSelectedTeamLeadObjs(objs);
            }}
            onSelectedEmployeesChange={(ids: string[], objs: EmployeeItem[]) => {
              setSelectedEmployeeIds(ids);
              setSelectedEmployeeObjs(objs);
            }}
          />

          {/* Category & Custom Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Category *"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Hardware & Devices', label: 'Hardware & Devices' },
                  { value: 'Software & Applications', label: 'Software & Applications' },
                  { value: 'Network & Connectivity', label: 'Network & Connectivity' },
                  { value: 'Access & Accounts', label: 'Access & Accounts' },
                  { value: 'Payroll & Benefits', label: 'Payroll & Benefits' },
                  { value: 'Facilities & Logistics', label: 'Facilities & Logistics' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>

            <div>
              <Select
                label="Priority *"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                options={[
                  { value: 'Low', label: 'Low (48 hrs SLA)' },
                  { value: 'Medium', label: 'Medium (24 hrs SLA)' },
                  { value: 'High', label: 'High (8 hrs SLA)' },
                  { value: 'Urgent', label: 'Urgent (4 hrs SLA)' },
                ]}
              />
            </div>
          </div>

          {category === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type Category <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="Type custom category name..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide a detailed description of the issue or service request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] text-slate-800 leading-relaxed"
            />
          </div>

          {/* Attachments */}
          <div className="pt-1">
            <AttachmentFilePicker
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
              label="Attachments (Optional)"
              buttonText="Browse Local Computer Files"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/workspace/my-tickets')}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white shadow-xs font-semibold cursor-pointer"
            >
              {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
