import React from 'react';
import {
    MessageSquare,
    Github,
    Pencil,
    Figma,
    FileText,
    GitPullRequest,
    Wrench,
    Image,
    BookOpen
} from 'lucide-react';

// Skill Card Component
interface SkillCardProps {
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    description: string;
    badge?: string;
    hasEdit?: boolean;
}

const SkillCard = ({ icon, iconBg = 'bg-gray-100', title, description, badge, hasEdit }: SkillCardProps) => (
    <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer group">
        {/* Icon */}
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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

        {/* Edit Button */}
        {hasEdit && (
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <Pencil size={16} />
            </button>
        )}
    </div>
);

// Main Skills Manager Component
const SkillsManager = () => {
    const installedSkills = [
        {
            icon: <Figma size={24} className="text-[#F24E1E]" />,
            iconBg: 'bg-white border border-gray-200',
            title: 'Figma MCP → Figma',
            description: 'Use Figma MCP for design-to-code work',
            badge: 'Team',
            hasEdit: true
        },
        {
            icon: <MessageSquare size={24} className="text-gray-600" />,
            iconBg: 'bg-gray-100',
            title: 'Skill Creator',
            description: 'Create or update a skill',
            hasEdit: true
        },
        {
            icon: <Github size={24} className="text-gray-900" />,
            iconBg: 'bg-gray-100',
            title: 'Skill Installer',
            description: 'Install curated skills from openai/skills or other repos',
            hasEdit: true
        }
    ];

    const recommendedSkills = [
        {
            icon: <MessageSquare size={24} className="text-gray-600" />,
            iconBg: 'bg-gray-100',
            title: 'Doc',
            description: 'Edit and review docx files'
        },
        {
            icon: <Github size={24} className="text-gray-900" />,
            iconBg: 'bg-gray-100',
            title: 'GH Address Comments',
            description: 'Address comments in a GitHub PR review'
        },
        {
            icon: <Github size={24} className="text-gray-900" />,
            iconBg: 'bg-gray-100',
            title: 'GH Fix CI',
            description: 'Fix failing GitHub CI actions'
        },
        {
            icon: <MessageSquare size={24} className="text-gray-600" />,
            iconBg: 'bg-gray-100',
            title: 'Imagegen',
            description: 'Generate and edit images using OpenAI'
        },
        {
            icon: <BookOpen size={24} className="text-gray-600" />,
            iconBg: 'bg-gray-100',
            title: 'Notion Knowledge Capture',
            description: 'Save knowledge and notes to Notion'
        },
        {
            icon: <FileText size={24} className="text-gray-600" />,
            iconBg: 'bg-gray-100',
            title: 'Notion Meeting Intelligence',
            description: 'Summarize and organize meeting notes'
        }
    ];

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
                        {installedSkills.map((skill, idx) => (
                            <SkillCard
                                key={idx}
                                icon={skill.icon}
                                iconBg={skill.iconBg}
                                title={skill.title}
                                description={skill.description}
                                badge={skill.badge}
                                hasEdit={skill.hasEdit}
                            />
                        ))}
                    </div>
                </div>

                {/* Recommended Section */}
                <div>
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Recommended</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {recommendedSkills.map((skill, idx) => (
                            <SkillCard
                                key={idx}
                                icon={skill.icon}
                                iconBg={skill.iconBg}
                                title={skill.title}
                                description={skill.description}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SkillsManager;
