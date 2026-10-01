import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  X,
  FileText,
  HelpCircle,
  Tag,
  Laptop,
  Cpu,
  Wifi,
  Key,
  Mail,
  Users,
  DollarSign,
  HelpCircle as GeneralIcon
} from 'lucide-react';
import { KBService, type KBArticle, type KBCategory } from '../services/kbService';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);

  const categoryCounts = useMemo(() => KBService.getCategoryCounts(), []);

  const articles = useMemo(() => {
    return KBService.searchArticles(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const categories: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'All Categories', value: 'All', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { label: 'Hardware', value: 'Hardware', icon: <Laptop className="w-3.5 h-3.5" /> },
    { label: 'Software', value: 'Software', icon: <Cpu className="w-3.5 h-3.5" /> },
    { label: 'Network', value: 'Network', icon: <Wifi className="w-3.5 h-3.5" /> },
    { label: 'Account & Access', value: 'Account & Access', icon: <Key className="w-3.5 h-3.5" /> },
    { label: 'Email', value: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
    { label: 'HR', value: 'HR', icon: <Users className="w-3.5 h-3.5" /> },
    { label: 'Finance', value: 'Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: 'General IT', value: 'General IT', icon: <GeneralIcon className="w-3.5 h-3.5" /> },
  ];

  const getCategoryBadgeVariant = (cat: KBCategory) => {
    switch (cat) {
      case 'Hardware': return 'warning';
      case 'Software': return 'info';
      case 'Network': return 'indigo';
      case 'Account & Access': return 'danger';
      case 'Email': return 'primary';
      case 'HR': return 'success';
      case 'Finance': return 'warning';
      case 'General IT': return 'neutral';
      default: return 'neutral';
    }
  };

  const handleOpenArticle = (art: KBArticle) => {
    setSelectedArticle(art);
    setFeedbackGiven(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 font-sans pb-16 max-w-7xl mx-auto">
      {/* Article Detail View */}
      {selectedArticle ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Bar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 px-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0284C7] transition-colors cursor-pointer w-fit"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Last updated: <strong className="text-slate-700">{selectedArticle.updatedAt}</strong>
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/create-ticket')}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold text-xs shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Create Ticket
              </Button>
            </div>
          </div>

          {/* Article Main Content Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={getCategoryBadgeVariant(selectedArticle.category)}>
                  {selectedArticle.category}
                </Badge>
                <span className="text-xs text-slate-400 font-medium">Article ID: {selectedArticle.id}</span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                {selectedArticle.title}
              </h1>

              <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                {selectedArticle.shortDescription}
              </p>
            </div>

            {/* Problem Box */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-2">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Problem / Issue Description
                </h3>
                <p className="text-xs text-amber-950 font-medium leading-relaxed pl-6">
                  {selectedArticle.problem}
                </p>
              </div>

              {/* Solution / Instructions */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Solution / Step-by-Step Instructions
                </h2>

                <div className="space-y-3">
                  {selectedArticle.solution.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-800 transition-all hover:bg-slate-50 hover:border-sky-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 font-medium leading-relaxed pt-0.5">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Article Helpful Feedback */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Was this solution helpful?</h4>
                  <p className="text-[11px] text-slate-500">Your feedback helps us improve self-service documentation.</p>
                </div>

                <div className="flex items-center gap-2">
                  {feedbackGiven ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Thank you for your feedback!
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setFeedbackGiven('yes')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackGiven('no')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-600" /> No
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Still Need Help Bar */}
              <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-[#0284C7] shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Still unable to resolve your issue?</span>
                    <span className="text-slate-500 text-[11px]">Submit a support ticket and our technical team will assist you directly.</span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/create-ticket')}
                  className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs shrink-0"
                >
                  Create Support Ticket
                </Button>
              </div>
            </div>
          </div>

          {/* Related Articles Section */}
          {(() => {
            const related = KBService.getRelatedArticles(selectedArticle);
            if (related.length === 0) return null;

            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-4 h-4 text-[#0284C7]" />
                  Related Help Articles
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {related.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => handleOpenArticle(rel)}
                      className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-[#0284C7] rounded-xl p-4 cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                    >
                      <div>
                        <Badge variant={getCategoryBadgeVariant(rel.category)} className="mb-2">
                          {rel.category}
                        </Badge>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors leading-snug line-clamp-2">
                          {rel.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {rel.shortDescription}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-semibold text-[#0284C7]">
                        <span>Read Article</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Main Knowledge Base List View */
        <div className="space-y-6">
          {/* Header Banner & Search Bar */}
          <div className="bg-[#0F172A] text-white p-6 md:p-8 rounded-2xl shadow-lg space-y-6 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-950/80 text-[#38BDF8] border border-sky-800/60 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                Employee Self-Service Knowledge Base
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                How can we help you today?
              </h1>
              <p className="text-xs md:text-sm text-slate-300 font-medium">
                Search step-by-step troubleshooting guides, IT hardware fixes, account reset instructions, and corporate policies.
              </p>
            </div>

            {/* Large Search Input */}
            <div className="relative z-10 max-w-2xl">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search solutions (e.g., VPN connecting, laptop not turning on, password reset, expense claim)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl pl-11 pr-10 py-3.5 text-xs md:text-sm font-medium shadow-lg focus:outline-none focus:ring-4 focus:ring-[#0284C7]/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Categories ({categories.length - 1})
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Showing {articles.length} article{articles.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                const count = categoryCounts[cat.value] || 0;

                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Articles Grid or Empty State */}
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => handleOpenArticle(art)}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-[#0284C7] p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={getCategoryBadgeVariant(art.category)}>
                        {art.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">{art.id}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors leading-snug">
                      {art.title}
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-normal">
                      {art.shortDescription}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {art.updatedAt}
                    </span>
                    <span className="font-semibold text-[#0284C7] group-hover:underline flex items-center gap-0.5">
                      Read Article <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Required Empty State Message & Create Ticket Action */
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-4 max-w-xl mx-auto my-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No solution found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  No solution found. You can create a ticket for further assistance.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => navigate('/create-ticket')}
                  className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs text-xs px-5 py-2.5"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Create Ticket
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
