import React, { useState } from 'react';
import {
    MessageSquare,
    Github,
    Pencil,
    Figma,
    FileText,
    GitPullRequest,
    Wrench,
    Image,
    BookOpen,
    Trash2,
    Download
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// Skill Card Component
interface SkillCardProps {
    id: string;
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    description: string;
    badge?: string;
    isInstalled?: boolean;
    onInstall?: () => void;
    onUninstall?: () => void;
}

const SkillCard = ({ id, icon, iconBg = 'bg-gray-100', title, description, badge, isInstalled, onInstall, onUninstall }: SkillCardProps) => (
    <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer group relative">
        {/* Icon */}
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
                {badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        <span className="w-3 h-3">📁</span>
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
            {isInstalled ? (
                <button
                    onClick={(e) => { e.stopPropagation(); onUninstall && onUninstall(); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Uninstall"
                >
                    <Trash2 size={16} />
                </button>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onInstall && onInstall(); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Install"
                >
                    <Download size={16} />
                </button>
            )}
        </div>
    </div>
);

// Main Skills Manager Component
const SkillsManager = () => {
    const { skills, installSkill, uninstallSkill } = useAppStore();

    const getIcon = (type: string, title?: string) => {
        const lower = (title || '').toLowerCase();
        if (type === 'mcp' || lower.includes('figma')) return <Figma size={24} className="text-[#F24E1E]" />;
        if (lower.includes('github') || lower.includes('gh')) return <Github size={24} className="text-gray-900" />;
        if (lower.includes('image')) return <Image size={24} className="text-purple-600" />;
        if (lower.includes('notion')) return <FileText size={24} className="text-gray-600" />;
        return <Wrench size={24} className="text-blue-600" />;
    };

    return (
        <div className="flex-1 bg-white overflow-y-auto min-h-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2">Skills</h1>
                    <p className="text-gray-500 text-lg">Give Codex super powers</p>
                </div>

                {/* Installed Section */}
                <div className="mb-10">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Installed</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {skills.installed.length === 0 && (
                            <p className="text-gray-400 text-sm italic col-span-2">No skills installed yet.</p>
                        )}
                        {skills.installed.map((skill, idx) => (
                            <SkillCard
                                key={skill.id || idx}
                                id={skill.id}
                                icon={getIcon(skill.type, skill.title)}
                                title={skill.title}
                                description={skill.description}
                                badge={skill.type === 'mcp' ? 'MCP' : undefined}
                                isInstalled={true}
                                onUninstall={() => uninstallSkill(skill.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Recommended Section */}
                <div>
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Recommended</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {skills.available.map((skill, idx) => (
                            <SkillCard
                                key={skill.id || idx}
                                id={skill.id}
                                icon={getIcon(skill.type, skill.title)}
                                title={skill.title}
                                description={skill.description}
                                isInstalled={false}
                                onInstall={() => installSkill(skill)}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SkillsManager;
