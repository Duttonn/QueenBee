import React, { useState } from 'react';
import {
  PenSquare,
  Clock,
  Plug,
  ChevronDown,
  ChevronRight,
  Folder,
  MessageSquare,
  Settings,
  Search
} from 'lucide-react';

interface SidebarProps {
  activeView: 'build' | 'automations' | 'skills';
  onViewChange: (view: 'build' | 'automations' | 'skills') => void;
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'AstroScope': true,
    'Wanderlust': false,
  });

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const projects = [
    {
      name: 'AstroScope',
      threads: [
        { id: '1', title: 'Update design system token', diff: '+47 -20', time: '3h' },
        { id: '2', title: 'Refactor SwiftUI views', diff: '+123 -45', time: '5h' },
        { id: '3', title: 'Add haptic feedback', diff: '+12 -3', time: '1d' },
      ]
    },
    {
      name: 'Wanderlust',
      threads: [
        { id: '4', title: 'Fix navigation bug', diff: '+8 -15', time: '2d' },
      ]
    }
  ];

  return (
    <div className="w-72 sm:w-72 bg-gray-50/95 backdrop-blur-xl h-full flex flex-col border-r border-gray-200/50 shadow-sm">

      {/* Top spacing */}
      <div className="h-4 flex-shrink-0"></div>

      {/* Search */}
      <div className="px-3 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/80 rounded-lg text-gray-400">
          <Search size={14} />
          <span className="text-sm">Search</span>
          <span className="ml-auto text-xs text-gray-400 font-mono hidden sm:block">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-2 space-y-0.5 mb-4">
        <NavItem
          icon={<PenSquare size={16} />}
          label="New thread"
          active={activeView === 'build'}
          onClick={() => onViewChange('build')}
        />
        <NavItem
          icon={<Clock size={16} />}
          label="Automations"
          active={activeView === 'automations'}
          onClick={() => onViewChange('automations')}
        />
        <NavItem
          icon={<Plug size={16} />}
          label="Skills"
          active={activeView === 'skills'}
          onClick={() => onViewChange('skills')}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-gray-200 mb-3"></div>

      {/* Threads Section */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Threads
        </div>

        {projects.map(project => (
          <div key={project.name} className="mb-2">
            {/* Folder Header */}
            <button
              onClick={() => toggleFolder(project.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expandedFolders[project.name] ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
              <Folder size={14} className="text-gray-400" />
              <span>{project.name}</span>
            </button>

            {/* Thread Items */}
            {expandedFolders[project.name] && (
              <div className="ml-4 space-y-0.5 mt-1">
                {project.threads.map(thread => (
                  <div
                    key={thread.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-mono">
                        <span className="text-green-600">{thread.diff.split(' ')[0]}</span>
                        {' '}
                        <span className="text-red-500">{thread.diff.split(' ')[1]}</span>
                      </span>
                      <span className="text-[10px] text-gray-400">{thread.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer: User Profile */}
      <div className="p-3 border-t border-gray-200/50">
        <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs text-white font-semibold shadow-sm">
            ND
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-gray-900 truncate">Natao Dutton</div>
            <div className="text-xs text-gray-500 truncate">Pro Plan</div>
          </div>
          <Settings size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>

    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
  >
    <span className={active ? 'text-gray-700' : 'text-gray-400'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export default Sidebar;