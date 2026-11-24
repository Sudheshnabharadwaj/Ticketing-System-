import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Check, Search, Loader2 } from 'lucide-react';
import { apiRequestSafe, jsonInit } from '../../services/backendAuth';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTeamName('');
      setSelectedUserIds([]);
      setSearch('');
      setError(null);
      return;
    }
    setTeamName(user?.team || `${user?.name || 'Lead'}'s Team`);
    setLoading(true);
    apiRequestSafe<any[]>('/team/all-members')
      .then(async (res) => {
        let members: any[] = [];
        if (res.data && res.data.length > 0) {
          members = res.data;
        } else {
          // Direct fallback from supabase if backend returns empty or network error
          try {
            const { data } = await supabase
              .from('users')
              .select('*')
              .neq('role', 'admin')
              .order('name', { ascending: true });
            members = data || [];
          } catch (supaErr) {
            console.warn('Supabase fallback load error:', supaErr);
          }
        }
        setLoading(false);
        setAllMembers(members);
        const currentTeam = user?.team || '';
        if (currentTeam) {
          const currentMembers = members
            .filter((m) => {
              const mTeam = (m.team || '').toLowerCase();
              return mTeam.includes(currentTeam.toLowerCase()) || m.team_lead_id === user?.id;
            })
            .map((m) => m.id);
          setSelectedUserIds(currentMembers);
        }
      })
      .catch(async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .neq('role', 'admin')
            .order('name', { ascending: true });
          setAllMembers(data || []);
        } catch {
          setAllMembers([]);
        }
        setLoading(false);
      });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const filteredMembers = allMembers.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.id || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Please provide a team name.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Please select at least one employee or team member to add to this team.');
      return;
    }

    setSubmitting(true);
    setError(null);

    let successCount = 0;
    try {
      const res = await apiRequestSafe<any>(
        '/team/create-and-assign',
        jsonInit('POST', {
          team_name: teamName.trim(),
          user_ids: selectedUserIds,
        })
      );
      if (!res.error && res.data) {
        successCount = res.data.assigned_count ?? selectedUserIds.length;
      } else if (res.error) {
        console.warn('Backend /team/create-and-assign failed, attempting direct Supabase fallback:', res.error);
        throw new Error(res.error);
      }
    } catch (apiErr: any) {
      // Supabase fallback: update team directly in users table
      try {
        const now = new Date().toISOString();
        const tlId = user?.id || '';
        
        // Update Team Lead's own team name
        if (tlId) {
          await (supabase.from('users') as any).update({ team: teamName.trim(), updated_at: now }).eq('id', tlId);
        }

        // Fetch current members to merge team without removing previous teams
        const { data: memberRows } = await supabase.from('users').select('*').in('id', selectedUserIds);
        for (const row of (memberRows || [])) {
          const oldTeam = (row.team || '').trim();
          const existingTeams = oldTeam ? oldTeam.split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean) : [];
          if (!existingTeams.includes(teamName.trim())) {
            existingTeams.push(teamName.trim());
          }
          const mergedTeam = existingTeams.join(', ');
          await (supabase.from('users') as any).update({ team: mergedTeam, updated_at: now }).eq('id', row.id);
          successCount++;
        }
      } catch (fallbackErr: any) {
        setSubmitting(false);
        setError(fallbackErr?.message || apiErr?.message || 'Failed to save team details. Please try again.');
        return;
      }
    }

    setSubmitting(false);
    onSuccess(`Team "${teamName.trim()}" created/updated with ${selectedUserIds.length} member(s).`);
    window.dispatchEvent(new Event('user-updated'));
    window.dispatchEvent(new Event('storage'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0284C7]" />
            <h2 className="font-bold text-slate-900 text-sm">Create / Manage Team</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Team Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Core Engineering, Squad Alpha, IT Ops"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Add Team Members ({selectedUserIds.length} selected)
              </label>
              <span className="text-[11px] text-slate-400">
                You can select any existing or already assigned member
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search any employee by name, ID, or department..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0284C7] focus:bg-white transition-all"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50/50 space-y-1">
              {loading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                  <span>Loading employees...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No members found.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = selectedUserIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelect(m.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-50 border-[#0284C7] text-slate-900 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-medium text-slate-900">{m.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {m.id} • {m.department || 'General'} {m.team ? `• Current Team: ${m.team}` : ''}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#0284C7] border-[#0284C7] text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-[#0284C7] hover:bg-[#0369a1] text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save Team & Members</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
