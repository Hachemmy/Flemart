import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { getApiUrl } from '../../config/api';
import ProjectCard from '../UI/ProjectCard';

interface Project {
    id: number;
    title: string;
    description: string;
    githubLink: string;
    status: 'success' | 'in_progress' | 'archived' | 'abandoned';
    readme: string;
}

interface GitHubRepo {
    id: number;
    name: string;
    description: string;
    html_url: string;
    language: string;
    updated_at: string;
    stargazers_count: number;
    fork: boolean;
}

export default function Projects() {
    const { token } = useAuth();
    const { t } = useI18n();
    const [projects, setProjects] = useState<Project[]>([]);
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [reposLoading, setReposLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [tab, setTab] = useState<'saved' | 'github'>('saved');
    const [importing, setImporting] = useState<number | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/api/projects`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error(t('auth.genericError'));
                const { projects: allProjects } = await response.json();
                const mapped = allProjects.map((p: any) => ({
                    ...p,
                    githubLink: p.github_link,
                }));
                setProjects(mapped as Project[]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [token]);

    const fetchRepos = async () => {
        if (!token) return;
        setReposLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/projects/github/repos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(t('auth.genericError'));
            const { repos: githubRepos } = await response.json();
            setRepos(githubRepos);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setReposLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'github' && repos.length === 0) {
            fetchRepos();
        }
    }, [tab]);

    const importRepo = async (repo: GitHubRepo, status: string) => {
        if (!token) return;
        setImporting(repo.id);
        try {
            const response = await fetch(`${getApiUrl()}/api/projects/github/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: repo.name,
                    description: repo.description,
                    html_url: repo.html_url,
                    status
                })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t('auth.genericError'));
            }
            const newProject: Project = {
                id: (await response.json()).projectId,
                title: repo.name,
                description: repo.description || '',
                githubLink: repo.html_url,
                status: status as Project['status'],
                readme: ''
            };
            setProjects(prev => [newProject, ...prev]);
            setRepos(prev => prev.filter(r => r.id !== repo.id));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(null);
        }
    };

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter((p) => p.status === filter);

    const statusFilters = [
        { value: 'all', label: t('projects.all'), count: projects.length },
        { value: 'success', label: t('projects.success'), count: projects.filter((p) => p.status === 'success').length },
        { value: 'in_progress', label: t('projects.inProgress'), count: projects.filter((p) => p.status === 'in_progress').length },
        { value: 'archived', label: t('projects.archived'), count: projects.filter((p) => p.status === 'archived').length },
        { value: 'abandoned', label: t('projects.abandoned'), count: projects.filter((p) => p.status === 'abandoned').length },
    ];

    const statusOptions = [
        { value: 'in_progress', label: t('projects.enCours'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        { value: 'success', label: t('projects.reussi'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { value: 'archived', label: t('projects.classe'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { value: 'abandoned', label: t('projects.abandonne'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {t('projects.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {t('projects.subtitle')}
                </p>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-surface-800 rounded-xl">
                <button
                    onClick={() => setTab('saved')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        tab === 'saved'
                            ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-brand-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    {t('projects.myProjects')} ({projects.length})
                </button>
                <button
                    onClick={() => setTab('github')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        tab === 'github'
                            ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-brand-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        {t('projects.githubRepos')}
                    </span>
                </button>
            </div>

            {tab === 'saved' && (
                <>
                    {!loading && projects.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                            {statusFilters.map((sf) => (
                                <button
                                    key={sf.value}
                                    onClick={() => setFilter(sf.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        filter === sf.value
                                            ? 'bg-brand-600 text-white shadow-glow'
                                            : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700'
                                    }`}
                                >
                                    {sf.label}
                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs ${
                                        filter === sf.value
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400'
                                    }`}>
                                        {sf.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {loading && (
                        <div className="grid gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-3 flex-1">
                                            <div className="skeleton h-6 w-48" />
                                            <div className="skeleton h-4 w-full max-w-sm" />
                                            <div className="skeleton h-20 w-full" />
                                        </div>
                                        <div className="skeleton h-6 w-20 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && !error && filteredProjects.length === 0 && (
                        <div className="card p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-surface-700 rounded-2xl mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {t('projects.noProjects')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {t('projects.importHint')}
                            </p>
                            <button
                                onClick={() => setTab('github')}
                                className="btn-primary text-sm"
                            >
                                {t('projects.viewGithub')}
                            </button>
                        </div>
                    )}

                    {!loading && !error && filteredProjects.length > 0 && (
                        <div className="grid gap-4">
                            {filteredProjects.map((project, index) => (
                                <div key={project.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <ProjectCard project={project} githubLinkText={t('projects.viewOnGithub')} />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'github' && (
                <>
                    {reposLoading && (
                        <div className="grid gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-3 flex-1">
                                            <div className="skeleton h-6 w-48" />
                                            <div className="skeleton h-4 w-full max-w-sm" />
                                        </div>
                                        <div className="skeleton h-8 w-24 rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!reposLoading && repos.length === 0 && (
                        <div className="card p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-surface-700 rounded-2xl mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.015c0 4.418 2.865 8.166 6.839 9.49.5.092.682-.217.682-.483 0-.237-.009-.943-.014-1.882-2.78.604-3.368-1.342-3.368-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62 0-.607.007-.607.993.007 1.522.007 1.522.89 0 1.68.007 1.99.007 1.107.007 1.827.007 1.107-.007 1.68-.007 1.522-0.007 1.522-0.007 0.908-.62 1.11-1.462 1.11-1.462.454-1.154 1.11-1.342 1.11-1.342.873.667 1.357 1.105 1.357 1.105.747 1.154.29 1.342.007 1.462-.667.007-1.357 0-1.357-0.007-0.573-0.007-0.943-0.007-0.943-0.007-0.265-0.007-0.493-0.007-0.493 0-0.265 0-0.493 0-0.493 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {t('projects.noRepos')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('projects.connectGithub')}
                            </p>
                        </div>
                    )}

                    {!reposLoading && repos.length > 0 && (
                        <div className="grid gap-3">
                            {repos.map((repo, index) => (
                                <div
                                    key={repo.id}
                                    className="card p-5 animate-slide-up"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {repo.name}
                                                </h3>
                                                {repo.fork && (
                                                    <span className="badge bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400 text-[10px]">
                                                        Fork
                                                    </span>
                                                )}
                                                {repo.language && (
                                                    <span className="badge bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px]">
                                                        {repo.language}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                                                {repo.description || 'Pas de description'}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    {repo.stargazers_count}
                                                </span>
                                                <span>Mis à jour le {new Date(repo.updated_at).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                                                </svg>
                                                {t('projects.viewOnGithub')}
                                            </a>
                                        </div>

                                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                                            {statusOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => importRepo(repo, opt.value)}
                                                    disabled={importing === repo.id}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 ${
                                                        importing === repo.id
                                                            ? 'bg-gray-100 dark:bg-surface-700 text-gray-400'
                                                            : opt.color
                                                    }`}
                                                >
                                                    {importing === repo.id ? '...' : opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {error && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-red-600 text-white rounded-xl shadow-lg text-sm font-medium animate-slide-up">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline">OK</button>
                </div>
            )}
        </div>
    );
}
