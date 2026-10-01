import React, { useState, useEffect } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { TicketCategory, TicketPriority } from '../../types/ticket';
import { CATEGORIES, PRIORITIES } from '../../utils/constants';
import { X, PlusCircle, Upload, AlertCircle, Check, Users, Building2, UserCheck, ArrowRight } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { AttachmentPicker, FileAttachmentItem } from '../common/AttachmentPicker';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

interface MemberOption {
  id: string;
  name: string;
  department: string;
  avatar: string;
  role?: string;
}

const ALL_DEPARTMENTS = [
  'IT Support',
  'Finance',
  'HR',
  'Operations',
  'Sales',
  'Marketing',
  'Administration',
  'Other',
];

// Department -> Member dataset mapping
const DEPARTMENT_MEMBERS: Record<string, MemberOption[]> = {
  'IT Support': [
    { id: 'EMP001', name: 'Rahul Sharma', department: 'IT Support', avatar: '' },
    { id: 'EMP006', name: 'Arjun Verma', department: 'IT Support', avatar: '' },
    { id: 'EMP007', name: 'Priya Nair', department: 'IT Support', avatar: '' },
  ],
  'Finance': [
    { id: 'EMP003', name: 'Marcus Vance', department: 'Finance', avatar: '' },
    { id: 'EMP008', name: 'Sneha Reddy', department: 'Finance', avatar: '' },
    { id: 'EMP009', name: 'Kiran Kumar', department: 'Finance', avatar: '' },
  ],
  'HR': [
    { id: 'EMP002', name: 'Sophia Chen', department: 'HR', avatar: '' },
    { id: 'EMP010', name: 'Kavya Patel', department: 'HR', avatar: '' },
  ],
  'Operations': [
    { id: 'EMP011', name: 'David Miller', department: 'Operations', avatar: '' },
    { id: 'EMP012', name: 'Vikram Singh', department: 'Operations', avatar: '' },
  ],
  'Sales': [
    { id: 'EMP013', name: 'Rohan Mehta', department: 'Sales', avatar: '' },
    { id: 'EMP014', name: 'Ananya Roy', department: 'Sales', avatar: '' },
  ],
  'Marketing': [
    { id: 'EMP004', name: 'Priya Patel', department: 'Marketing', avatar: '' },
    { id: 'EMP015', name: 'Tanvi Shah', department: 'Marketing', avatar: '' },
  ],
  'Administration': [
    { id: 'EMP016', name: 'Meera Kapoor', department: 'Administration', avatar: '' },
  ],
  'Other': [
    { id: 'TL001', name: 'Alex Morgan', department: 'Other', avatar: '' },
  ],
};

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const { createTicket } = useTickets();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Access Issue');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  
  // Multi-department state (defaults to ['IT Support'])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['IT Support']);
  
  // Multi-member tagged state
  const [taggedMembers, setTaggedMembers] = useState<MemberOption[]>([]);
  const [fileAttachments, setFileAttachments] = useState<FileAttachmentItem[]>([]);
  const [error, setError] = useState('');

  // Automatically remove tagged members if their department is unselected
  useEffect(() => {
    setTaggedMembers((prev) =>
      prev.filter((m) => selectedDepartments.includes(m.department))
    );
  }, [selectedDepartments]);

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(dept)) {
        return prev.filter((d) => d !== dept);
      } else {
        return [...prev, dept];
      }
    });
  };

  const toggleMemberTag = (member: MemberOption) => {
    setTaggedMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const removeMemberTag = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaggedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      setError('Please enter a ticket subject.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a ticket description.');
      return;
    }
    if (selectedDepartments.length === 0) {
      setError('Please select at least one department.');
      return;
    }

    setError('');

    const newTicket = createTicket({
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      department: selectedDepartments.join(', '),
      departments: selectedDepartments,
      taggedMembers: taggedMembers.map((m) => ({
        id: m.id,
        name: m.name,
        department: m.department,
        avatar: m.avatar,
      })),
      taggedMemberIds: taggedMembers.map((m) => m.id),
      attachments: fileAttachments.map((f) => ({ name: f.name, size: f.size })),
    });

    if (onSuccess) {
      onSuccess(`Ticket ${newTicket.id} created successfully.`);
    }

    // Reset Form
    setSubject('');
    setDescription('');
    setSelectedDepartments(['IT Support']);
    setTaggedMembers([]);
    setFileAttachments([]);
    onClose();
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
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Create Support Ticket</h2>
              <p className="text-xs text-slate-500">Route tickets across multiple departments & tag assigned team members</p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
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
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800"
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

          {/* MULTIPLE DEPARTMENT SELECTION */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Department Selection <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-normal">Select one or more departments</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_DEPARTMENTS.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/80 text-sky-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{dept}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC TEAM MEMBERS SELECTION (SHOW MEMBERS BELONGING ONLY TO SELECTED DEPARTMENTS) */}
          {selectedDepartments.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  Tag Team Members
                </label>
                <span className="text-[11px] text-slate-400 font-normal">Select members from target departments</span>
              </div>

              {/* Removable Tagged Member Chips */}
              {taggedMembers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Tagged:</span>
                  {taggedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs"
                    >
                      <UserAvatar name={m.name} avatar={m.avatar} size="xs" />
                      <span>{m.name}</span>
                      <span className="text-[10px] text-sky-600 font-normal">({m.department})</span>
                      <button
                        type="button"
                        onClick={(e) => removeMemberTag(m.id, e)}
                        className="p-0.5 hover:bg-sky-200 rounded text-sky-700 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Department Grouped Member Cards */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {selectedDepartments.map((dept) => {
                  const members = DEPARTMENT_MEMBERS[dept] || [];
                  if (members.length === 0) return null;

                  return (
                    <div key={dept} className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-500" />
                        <span>{dept} Members</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {members.map((member) => {
                          const isTagged = taggedMembers.some((m) => m.id === member.id);
                          return (
                            <div
                              key={member.id}
                              onClick={() => toggleMemberTag(member)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isTagged
                                  ? 'border-sky-500 bg-sky-50/90 text-sky-950 font-semibold shadow-2xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <UserAvatar name={member.name} avatar={member.avatar} size="xs" />
                                <div className="truncate">
                                  <div className="text-xs font-semibold truncate leading-tight">{member.name}</div>
                                  <div className="text-[10px] text-slate-500 font-normal truncate">{member.department}</div>
                                </div>
                              </div>
                              {isTagged && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TICKET ROUTING SUMMARY */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                  Ticket Routing Summary
                </div>
                {selectedDepartments.map((dept) => {
                  const deptMembers = taggedMembers.filter((m) => m.department === dept);
                  return (
                    <div key={dept} className="text-xs flex items-center gap-1.5 text-slate-700 font-medium">
                      <span className="font-semibold text-slate-900">{dept}:</span>
                      {deptMembers.length > 0 ? (
                        <span className="text-sky-700 font-medium">{deptMembers.map((m) => m.name).join(', ')}</span>
                      ) : (
                        <span className="text-slate-400 italic">No specific member tagged (Department auto-route)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 resize-none"
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
