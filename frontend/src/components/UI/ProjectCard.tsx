import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { getApiUrl } from '../../config/api';

interface Project {
    id: number;
    title: string;
    description: string;
    githubLink: string;
    status: 'success' | 'in_progress' | 'archived' | 'abandoned';
    readme: string;
}

interface ProjectCardProps {
    project: Project;
    githubLinkText?: string;
    onStatusChange?: (id: number, newStatus: string) => void;
}

const statusConfig = {
    success: {
        colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
        dot: 'bg-emerald-500',
        label: 'Reussi',
    },
    in_progress: {
        colors: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
        dot: 'bg-amber-500',
        label: 'En cours',
    },
    archived: {
        colors: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700/30',
        dot: 'bg-gray-400',
        label: 'Classe',
    },
    abandoned: {
        colors: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
        dot: 'bg-red-500',
        label: 'Abandonne',
    },
};

const allStatuses = [
    { value: 'in_progress', label: 'En cours', dot: 'bg-amber-500' },
    { value: 'success', label: 'Reussi', dot: 'bg-emerald-500' },
    { value: 'archived', label: 'Classe', dot: 'bg-gray-400' },
    { value: 'abandoned', label: 'Abandonne', dot: 'bg-red-500' },
];

export default function ProjectCard({ project, githubLinkText, onStatusChange }: ProjectCardProps) {
    const { t } = useI18n();
    const { token } = useAuth();
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(project.status);
    const [updating, setUpdating] = useState(false);
    const [expandedReadme, setExpandedReadme] = useState(false);

    const resolvedLinkText = githubLinkText || t('projects.viewOnGithub');

    const changeStatus = async (newStatus: string) => {
        if (newStatus === currentStatus || updating) return;
        setUpdating(true);
        setShowStatusMenu(false);
        try {
            const response = await fetch(`${getApiUrl()}/api/projects/${project.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error(t('auth.genericError'));
            setCurrentStatus(newStatus as Project['status']);
            if (onStatusChange) onStatusChange(project.id, newStatus);
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    const activeConfig = statusConfig[currentStatus];

    return (
        <div className="card p-6 group hover:border-brand-200 dark:hover:border-brand-800/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                    {project.title}
                </h2>

                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        disabled={updating}
                        className={`badge border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${activeConfig.colors} ${updating ? 'opacity-50' : ''}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${activeConfig.dot} mr-1.5`} />
                        {t(`status.${currentStatus}`)}
                        <svg className="w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>

                    {showStatusMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-surface-800 rounded-xl shadow-float border border-gray-200/60 dark:border-surface-700/60 z-50 py-1 animate-scale-in origin-top-right">
                                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    {t('projects.changeStatus')}
                                </p>
                                {allStatuses.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => changeStatus(s.value)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                                            currentStatus === s.value
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-700'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                        {t(`status.${s.value}`)}
                                        {currentStatus === s.value && (
                                            <svg className="w-3.5 h-3.5 ml-auto text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {project.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                </p>
            )}

            {project.readme && (
                <div className="mb-4">
                    <p className={`text-sm text-gray-500 dark:text-gray-400 italic leading-relaxed ${expandedReadme ? '' : 'line-clamp-2'}`}>
                        {project.readme}
                    </p>
                    <button
                        onClick={() => setExpandedReadme(!expandedReadme)}
                        className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline mt-1"
                    >
                        {expandedReadme ? t('home.readmeLess') : t('home.readmeMore')}
                    </button>
                </div>
            )}

            {project.githubLink && (
                <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors group/link"
                >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    {resolvedLinkText}
                </a>
            )}
        </div>
    );
}
