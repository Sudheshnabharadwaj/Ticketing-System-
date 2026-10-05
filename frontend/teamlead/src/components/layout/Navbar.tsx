import React from 'react';
import { Menu, Search } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileDropdown } from './ProfileDropdown';

interface NavbarProps {
  onMobileMenuToggle: () => void;
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMobileMenuToggle,
  globalSearch,
  setGlobalSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs w-full max-w-full min-w-0">
      <div className="flex items-center space-x-3 min-w-0 shrink-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-none cursor-pointer"
          aria-label="Toggle Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-2 sm:mx-6 min-w-0">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search tickets, priority, status..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        <NotificationDropdown />
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        <ProfileDropdown />
      </div>
    </header>
  );
};
