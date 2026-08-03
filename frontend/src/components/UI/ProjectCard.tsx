import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { getApiUrl, authorizedFetch } from '../../config/api';

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
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

const statusConfig = {
    success: {
        colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
        dot: 'bg-emerald-500',
    },
    in_progress: {
        colors: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
        dot: 'bg-amber-500',
    },
    archived: {
        colors: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700/30',
        dot: 'bg-gray-400',
    },
    abandoned: {
        colors: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
        dot: 'bg-red-500',
    },
};

const allStatuses = [
    { value: 'in_progress', dot: 'bg-amber-500' },
    { value: 'success', dot: 'bg-emerald-500' },
    { value: 'archived', dot: 'bg-gray-400' },
    { value: 'abandoned', dot: 'bg-red-500' },
];

export default function ProjectCard({ project, githubLinkText, onStatusChange, onEdit, onDelete }: ProjectCardProps) {
    const { t } = useI18n();
    const { token } = useAuth();
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(project.status);
    const [updating, setUpdating] = useState(false);
    const [expandedReadme, setExpandedReadme] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    const resolvedLinkText = githubLinkText || t('projects.viewOnGithub');

    const changeStatus = async (newStatus: string) => {
        if (newStatus === currentStatus || updating) return;
        setUpdating(true);
        setShowStatusMenu(false);
        setStatusError(null);
        try {
            const response = await authorizedFetch(`${getApiUrl()}/api/projects/${project.id}`, token, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error(t('auth.genericError'));
            setCurrentStatus(newStatus as Project['status']);
            if (onStatusChange) onStatusChange(project.id, newStatus);
        } catch {
            setStatusError(t('auth.genericError'));
        } finally {
            setUpdating(false);
        }
    };

    const activeConfig = statusConfig[currentStatus];

    return (
        <div className="card p-6 group hover:border-brand-200 dark:hover:border-brand-800/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors break-words">
                        {project.title}
                    </h2>
                    {(onEdit || onDelete) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(project)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
                                    title={t('projects.editProject')}
                                    aria-label={t('projects.editProject')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(project)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title={t('projects.deleteProject')}
                                    aria-label={t('projects.deleteProject')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

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

            {statusError && (
                <p className="mb-3 text-xs font-medium text-red-500">{statusError}</p>
            )}

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
