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
  ChevronDown,
  Trash2,
  Play as PlayIcon
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// Recipe Card Component
const AutomationCard = ({ icon, title, description, active, onToggle, onDelete, onRun }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRun: () => void;
}) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 group">
    <div className="flex justify-between items-start mb-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggle}
          className={`w-10 h-5 rounded-full transition-colors relative ${active ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>
    <button
      onClick={onRun}
      className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-all"
    >
      <PlayIcon size={12} />
      Run Now
    </button>
  </div>
);

// Create Automation Modal
const CreateAutomationModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (data: any) => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:30');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title) return;
    onCreate({
      title,
      description,
      schedule: scheduleTime,
    });
    onClose();
    // Reset form
    setTitle('');
    setDescription('');
  };

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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Daily code review"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does it do?"
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
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
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
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Automation
          </button>
        </div>
      </div>
    </div>
  );
};

const AutomationDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { automations, addAutomation, toggleAutomation, deleteAutomation, runAutomation } = useAppStore();

  const getIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('cloud')) return <Cloud className="text-blue-500" size={24} />;
    if (lower.includes('review')) return <Pencil className="text-orange-500" size={24} />;
    if (lower.includes('doc')) return <BookOpen className="text-purple-500" size={24} />;
    if (lower.includes('summary') || lower.includes('summarize')) return <MessageSquare className="text-green-500" size={24} />;
    if (lower.includes('pr ')) return <GitPullRequest className="text-pink-500" size={24} />;
    return <Clock className="text-cyan-500" size={24} />;
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto min-h-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-3">Automations</h1>
            <p className="text-gray-500 text-lg">Create agents that run in the background.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            <span>New Automation</span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((recipe) => (
            <AutomationCard
              key={recipe.id}
              icon={getIcon(recipe.title)}
              title={recipe.title}
              description={recipe.description}
              active={recipe.active}
              onToggle={() => toggleAutomation(recipe.id, !recipe.active)}
              onDelete={() => {
                if (confirm('Delete this automation?')) deleteAutomation(recipe.id);
              }}
              onRun={async () => {
                if (recipe.script) {
                  try {
                    const res = await runAutomation(recipe.script);
                    alert(`Result: ${res.stdout}`);
                  } catch (e) { alert('Error running automation'); }
                } else {
                  alert('No script defined for this automation.');
                }
              }}
            />
          ))}
        </div>

      </div>

      {/* Create Modal */}
      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={addAutomation}
      />
    </div>
  );
};

export default AutomationDashboard;
