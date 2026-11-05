import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';

export const ActivityBar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeView,
  setActiveView,
  isAIOpen,
  setIsAIOpen,
}) => {
  const { user } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleNavClick = (viewName) => {
    if (activeView === viewName && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setActiveView(viewName);
      setIsSidebarOpen(true);
    }
  };

  const navItems = [
    {
      id: 'explorer',
      title: 'Explorer (Ctrl+Shift+E)',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'search',
      title: 'Search (Ctrl+Shift+F)',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      id: 'source-control',
      title: 'Source Control (Ctrl+Shift+G)',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="9" r="2.5" />
          <path d="M6 8.5v7m3-4.5h3.5a3 3 0 013 3v0" />
        </svg>
      ),
    },
    {
      id: 'debug',
      title: 'Run and Debug (Ctrl+Shift+D)',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
    {
      id: 'extensions',
      title: 'Extensions (Ctrl+Shift+X)',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-[48px] shrink-0 bg-[#181818] border-r border-[#2b2b2b] flex flex-col items-center justify-between py-2 select-none z-30">
      {/* Top Main Navigation */}
      <div className="flex flex-col items-center space-y-1 w-full">
        {navItems.map((item) => {
          const isActive = isSidebarOpen && activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={item.title}
              className={`w-12 h-11 flex items-center justify-center transition relative ${
                isActive
                  ? 'text-white'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#007acc]" />
              )}
              {item.icon}
            </button>
          );
        })}

        {/* AI Assistant Toggle Button */}
        <button
          onClick={() => setIsAIOpen(!isAIOpen)}
          title={`Devnest AI Assistant (${isAIOpen ? 'Open' : 'Closed'})`}
          className={`w-12 h-11 flex items-center justify-center transition relative ${
            isAIOpen ? 'text-[#38bdf8]' : 'text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          {isAIOpen && (
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#38bdf8]" />
          )}
          <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Profile and Settings */}
      <div className="flex flex-col items-center space-y-1 w-full pb-1">
        {/* Account / User Avatar */}
        <div
          title={user?.email ? `Signed in as ${user.email}` : 'User Profile'}
          className="w-8 h-8 rounded-full bg-[#252526] border border-[#333333] flex items-center justify-center text-xs font-semibold text-[#cccccc] cursor-pointer hover:border-[#007acc] transition mb-1"
        >
          {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
        </div>

        {/* Settings Gear */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Manage (Settings)"
            className={`w-12 h-10 flex items-center justify-center transition ${
              isSettingsOpen ? 'text-white' : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {isSettingsOpen && (
            <div className="absolute left-full bottom-0 ml-2 w-48 py-1 bg-[#252526] border border-[#333333] rounded shadow-2xl z-50 text-xs font-sans text-[#cccccc]">
              <div className="px-3 py-1 font-semibold text-[11px] text-[#858585] uppercase tracking-wider">
                Settings
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Keyboard Shortcuts
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Color Theme (Dark+)
              </button>
              <div className="my-1 border-t border-[#333333]" />
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Devnest v1.0.0
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
