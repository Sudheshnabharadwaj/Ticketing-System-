import React, { useState } from 'react';
import { mockKBArticles } from '../../mock/knowledgeBase';
import { KnowledgeBaseArticle } from '../../types/knowledgeBase';
import { SearchBar } from '../../components/common/SearchBar';
import { KB_CATEGORIES } from '../../utils/constants';
import { BookOpen, ThumbsUp, Eye, FileText, ChevronRight, X } from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<KnowledgeBaseArticle | null>(null);

  const filteredArticles = mockKBArticles.filter((art) => {
    const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
    const matchesSearch =
      art.title.toLowerCase().includes(search.toLowerCase()) ||
      art.description.toLowerCase().includes(search.toLowerCase()) ||
      art.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-snug">IT Knowledge Base</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Self-service documentation, troubleshooting articles, and IT procedure guides.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search articles, setup guides, VPN fixes..."
        className="max-w-2xl"
      />

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedCategory === 'All'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {KB_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => setActiveArticle(article)}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100">
                  {article.category}
                </span>
                <span className="text-[10px] text-slate-400">Updated {article.updatedAt}</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors mb-2">
                {article.title}
              </h3>

              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                {article.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" /> {article.views}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> {article.helpfulCount}
                </span>
              </div>
              <span className="font-semibold text-sky-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                Read Guide <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-700">
                  {activeArticle.category}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{activeArticle.title}</h2>
              </div>
              <button
                onClick={() => setActiveArticle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto prose prose-sky max-w-none text-xs leading-relaxed text-slate-700">
              <div className="whitespace-pre-wrap font-sans">{activeArticle.content}</div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Was this article helpful?</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg border border-emerald-200 flex items-center gap-1"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Yes ({activeArticle.helpfulCount})
                </button>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-3 py-1.5 bg-white text-slate-600 hover:bg-slate-100 font-medium rounded-lg border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
