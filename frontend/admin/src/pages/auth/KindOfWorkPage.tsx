import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Megaphone, 
  Briefcase,
  ArrowRight, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getCurrentSessionUser } from '../../services/unifiedAuth';

interface WorkOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const workOptions: WorkOption[] = [
  {
    id: 'software-development',
    label: 'Software Development',
    description: 'Engineering, DevOps, QA & System Architecture',
    icon: <Code2 className="w-5 h-5" />,
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Accounting, Billing, Audit & Financial Operations',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'Talent Acquisition, People Ops & Payroll',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Account Management, Leads & Business Dev',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Campaigns, Content, SEO & Brand Ops',
    icon: <Megaphone className="w-5 h-5" />,
  },
  {
    id: 'others',
    label: 'Others',
    description: 'General Operations & Administration',
    icon: <Briefcase className="w-5 h-5" />,
  },
];

export const KindOfWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (error) {
      setError('');
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedId) {
      setError('Please select your area of work to continue');
      return;
    }

    setIsSubmitting(true);
    const selectedCategory = workOptions.find((opt) => opt.id === selectedId);
    if (selectedCategory) {
      localStorage.setItem('selectedWorkCategory', selectedCategory.label);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      const currentUser = getCurrentSessionUser();
      if (currentUser?.role === 'teamlead') {
        navigate('/teamlead/dashboard');
      } else if (currentUser?.role === 'employee') {
        navigate('/employee/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
          <Briefcase className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Kind of Work
        </h2>
        <p className="text-xs text-slate-500">
          Select your area of work
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-8">
          <form onSubmit={handleContinue} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workOptions.map((option) => {
                const isSelected = selectedId === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    className={`relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-[#0284C7] bg-sky-50/40 ring-2 ring-[#0284C7]/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#0284C7] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div className="ml-2">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-[#0284C7]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 font-semibold mt-6"
              disabled={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving Preference...' : 'Continue'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Secured with 256-bit TLS enterprise encryption</span>
        </div>
      </div>
    </div>
  );
};
