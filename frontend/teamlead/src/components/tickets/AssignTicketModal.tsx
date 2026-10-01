import React, { useState } from 'react';
import { Ticket, TicketPriority } from '../../types/ticket';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { UserCheck, X, CheckCircle2 } from 'lucide-react';

interface AssignTicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AssignTicketModal: React.FC<AssignTicketModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  if (!isOpen || !ticket) return null;

  const { users } = useAuth();
  const { assignAgent, changePriority } = useTickets();

  // Filter Active Employees
  const activeEmployees = users.filter((u) => u.status === 'Active');

  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>(
    ticket.assignedAgent && ticket.assignedAgent !== 'Unassigned'
      ? ticket.assignedAgent
      : activeEmployees[0]?.name || ''
  );
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [error, setError] = useState('');

  const isReassign = ticket.assignedAgent && ticket.assignedAgent !== 'Unassigned';

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmployeeName) {
      setError('Please select an active employee.');
      return;
    }

    const selectedEmployee = activeEmployees.find((u) => u.name === selectedEmployeeName);
    const empId = selectedEmployee ? selectedEmployee.id : 'EMP-001';

    // Call Context Assign
    assignAgent(ticket.id, empId, selectedEmployeeName);

    // Update Priority if changed
    if (priority !== ticket.priority) {
      changePriority(ticket.id, priority);
    }

    const toastMsg = `Ticket ${ticket.id} assigned successfully.`;
    if (onSuccessToast) {
      onSuccessToast(toastMsg);
    } else {
      alert(toastMsg);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isReassign ? 'Reassign Ticket' : 'Assign Ticket'}
            </h2>
            <p className="text-xs text-slate-500">
              Select an active employee to resolve this support ticket.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-3.5 text-xs">
          {/* Ticket Information Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Ticket ID:</span>
              <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                {ticket.id}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Ticket Subject: </span>
              <span className="text-slate-800 font-medium">{ticket.subject}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-500">Current Assignment:</span>
              <span className={`font-semibold ${isReassign ? 'text-slate-800' : 'text-amber-700 font-bold'}`}>
                {ticket.assignedAgent || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Employee Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployeeName}
              onChange={(e) => setSelectedEmployeeName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {activeEmployees.length === 0 ? (
                <option value="">No Active Employees Found</option>
              ) : (
                activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} - {emp.id} ({emp.department})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1 hover:shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isReassign ? 'Reassign Ticket' : 'Assign Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
