import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft, CheckCircle, Mail, ExternalLink, AlertCircle, Check } from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import { EmailService, type SentEmailNotification } from '../services/emailService';
import type { TicketPriority } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { AttachmentFilePicker, type AttachedFile } from '../components/ui/AttachmentFilePicker';
import { TeamLeadEmployeeSelector } from '../components/ui/TeamLeadEmployeeSelector';
import type { TeamLeadItem, EmployeeItem } from '../services/organizationService';

const DEPARTMENT_OPTIONS = [
  'IT Support',
  'Finance',
  'HR Operations',
  'Facilities',
  'General Administration',
  'Other',
];

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();

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

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');
  const [sentEmailLogs, setSentEmailLogs] = useState<SentEmailNotification[]>([]);

  const toggleDepartment = (deptName: string) => {
    if (selectedDepartments.includes(deptName)) {
      if (selectedDepartments.length === 1) return; // Keep at least 1 department selected
      setSelectedDepartments(selectedDepartments.filter((d) => d !== deptName));
    } else {
      setSelectedDepartments([...selectedDepartments, deptName]);
    }
  };

  const isOtherDeptSelected = selectedDepartments.includes('Other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 17. VALIDATION
    if (!subject.trim()) {
      setValidationError('Subject is required');
      return;
    }
    if (selectedDepartments.length === 0) {
      setValidationError('Department is required');
      return;
    }
    if (selectedTeamLeadIds.length === 0) {
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

    const attachmentStrings = attachedFiles.map((f) => `${f.name} (${f.size})`);

    try {
      const newTicket = EmployeeService.createTicket({
        title: subject.trim(),
        description: description.trim(),
        category: finalCategory,
        departments: finalDepartments,
        priority,
        attachments: attachmentStrings,
        teamLeads: selectedTeamLeadObjs.map((tl) => ({
          id: tl.id,
          name: tl.name,
          email: tl.email,
          department: tl.departmentName,
          role: tl.role,
        })),
        employees: selectedEmployeeObjs.map((emp) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          employeeId: emp.employeeId,
        })),
      });

      // Retrieve sent email logs for this ticket
      const recentEmails = EmailService.getSentEmailLogs();
      const emails = recentEmails.filter((em) => em.ticketId === newTicket.id);

      setCreatedTicketId(newTicket.id);
      setSentEmailLogs(emails);
      setIsSuccess(true);
    } catch {
      setValidationError('Ticket created, but email notification failed.');
    }
  };

  if (isSuccess) {
    const isEmailsSent = sentEmailLogs.length > 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6 font-sans my-8">
        {/* Ticket Created Status Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl text-center space-y-4">
          {isEmailsSent ? (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Ticket created successfully.</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Mail className="w-3.5 h-3.5" />
                Email sent successfully.
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Email notifications have been delivered to all assigned department Team Leads and tagged employees:
              </p>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-left max-w-md mx-auto space-y-1.5">
                {sentEmailLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {log.recipientName} ({log.recipientRole})
                    </span>
                    <span className="font-mono text-[11px] text-[#0284C7]">{log.recipientEmail}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-amber-800">
                Ticket created, but email notification failed.
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your ticket was saved successfully in the support queue.
              </p>
            </>
          )}
        </div>

        {/* Detailed Email Payload Logs */}
        {sentEmailLogs.map((emailLog) => (
          <div key={emailLog.id} className="bg-white border border-sky-200 rounded-2xl shadow-md overflow-hidden">
            <div className="bg-[#0F172A] text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#38BDF8]" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Email Notification: {emailLog.recipientName}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Department Team Lead: {emailLog.recipientRole}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {emailLog.status}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {emailLog.recipientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      To: {emailLog.recipientName} ({emailLog.recipientRole})
                    </p>
                    <p className="text-[11px] font-mono font-semibold text-[#0284C7]">
                      {emailLog.recipientEmail}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Sent: {new Date(emailLog.sentAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</div>
                  <div className="text-xs font-bold text-slate-900">{emailLog.subject}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket ID</span>
                    <span className="text-xs font-mono font-bold text-[#0284C7]">{emailLog.ticketNumber}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                    <span className="text-xs font-semibold text-slate-800">{emailLog.department}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                    <span className="text-xs font-semibold text-slate-800">{emailLog.category}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                    <Badge priority={emailLog.priority as any} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/tickets')}
            className="w-full sm:w-auto border-slate-200 text-slate-700 font-semibold"
          >
            View My Tickets
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(`/tickets/${createdTicketId}`)}
            className="w-full sm:w-auto bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Open Ticket Details
          </Button>
        </div>
      </div>
    );
  }

  const activeDepartments = selectedDepartments.map((dept) =>
    dept === 'Other' ? (customDepartment.trim() || 'Other Department') : dept
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0284C7] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100 flex items-center justify-center shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Create New Support Ticket</h1>
            <p className="text-xs text-slate-500 font-medium">
              Fill out the form below to submit a new issue. Select multiple departments & team leads as needed.
            </p>
          </div>
        </div>

        {validationError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Subject Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Brief summary of your issue (e.g. Laptop battery draining quickly)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {DEPARTMENT_OPTIONS.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`flex items-center gap-2 p-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#0284C7] border-[#0284C7] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{dept}</span>
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
                <Input
                  required
                  placeholder="Type custom department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Unified Team Lead & Employee Tagging Component */}
          <TeamLeadEmployeeSelector
            role="employee"
            selectedDepartments={activeDepartments}
            selectedTeamLeadIds={selectedTeamLeadIds}
            onSelectedTeamLeadsChange={(ids, objs) => {
              setSelectedTeamLeadIds(ids);
              setSelectedTeamLeadObjs(objs);
            }}
            selectedEmployeeIds={selectedEmployeeIds}
            onSelectedEmployeesChange={(ids, objs) => {
              setSelectedEmployeeIds(ids);
              setSelectedEmployeeObjs(objs);
            }}
          />

          {/* Category Row */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Hardware & Devices', label: 'Hardware & Devices' },
                { value: 'Access & Permissions', label: 'Access & Permissions' },
                { value: 'Network & Connectivity', label: 'Network & Connectivity' },
                { value: 'HR & Benefits', label: 'HR & Benefits' },
                { value: 'General Administration', label: 'General Administration' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            {category === 'Other' && (
              <div className="mt-2.5">
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
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Priority <span className="text-red-500">*</span>
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              options={[
                { value: 'Low', label: 'Low - General Inquiry' },
                { value: 'Medium', label: 'Medium - Standard Support' },
                { value: 'High', label: 'High - High Impact' },
                { value: 'Urgent', label: 'Urgent - Work Stopped' },
              ]}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear steps, error messages, or context to help support staff resolve your ticket faster..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all"
            />
          </div>

          {/* System File Picker Attachment Component */}
          <AttachmentFilePicker
            files={attachedFiles}
            onFilesChange={setAttachedFiles}
            label="Attachments (Optional)"
            buttonText="Upload Files from Local PC"
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!subject.trim() || !description.trim() || selectedDepartments.length === 0}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
