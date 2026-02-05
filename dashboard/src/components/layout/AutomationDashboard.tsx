import React, { useState } from 'react';
import {
  Cloud,
  Pencil,
  BookOpen,
  MessageSquare,
  GitPullRequest,
  Clock,
  Plus,
  X,
  ChevronDown
} from 'lucide-react';

// Recipe Card Component
const AutomationCard = ({ icon, title, description, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-lg hover:border-gray-200 transition-all duration-200 group"
  >
    <div className="mb-3 text-2xl">{icon}</div>
    <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-gray-800">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </button>
);

// Create Automation Modal
const CreateAutomationModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Automation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              placeholder="e.g., Daily code review"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Workspaces Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Workspaces</label>
            <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:border-gray-300 transition-colors">
              <span>Choose a folder</span>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <div className="flex gap-3">
              <input
                type="text"
                defaultValue="09:30"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 hover:border-gray-300 transition-colors">
                AM
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
            Create Automation
          </button>
        </div>
      </div>
    </div>
  );
};

const AutomationDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const automations = [
    {
      icon: <Cloud className="text-blue-500" size={24} />,
      title: 'Sync to cloud',
      description: 'Automatically back up your work to the cloud every hour.'
    },
    {
      icon: <Pencil className="text-orange-500" size={24} />,
      title: 'Code review comments',
      description: 'Review PR comments and suggest improvements.'
    },
    {
      icon: <BookOpen className="text-purple-500" size={24} />,
      title: 'Generate docs',
      description: 'Keep documentation up to date with code changes.'
    },
    {
      icon: <MessageSquare className="text-green-500" size={24} />,
      title: 'Summarize threads',
      description: 'Get a daily digest of your development threads.'
    },
    {
      icon: <GitPullRequest className="text-pink-500" size={24} />,
      title: 'PR automation',
      description: 'Automatically create and manage pull requests.'
    },
    {
      icon: <Clock className="text-cyan-500" size={24} />,
      title: 'Scheduled tasks',
      description: 'Run custom scripts on a schedule.'
    },
  ];

  return (
    <div className="flex-1 bg-white overflow-y-auto min-h-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl mb-4">
            <Cloud size={24} className="text-gray-600 sm:hidden" />
            <Cloud size={28} className="text-gray-600 hidden sm:block" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Let's automate</h1>
          <p className="text-gray-500 text-sm sm:text-base">Automate work by setting up scheduled tasks</p>
        </div>

        {/* Create Button */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create Automation</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>

        {/* Grid of Automation Cards - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {automations.map((auto, idx) => (
            <AutomationCard
              key={idx}
              icon={auto.icon}
              title={auto.title}
              description={auto.description}
            />
          ))}
        </div>

      </div>

      {/* Create Modal */}
      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default AutomationDashboard;
