import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';
import { getApiUrl, authorizedFetch } from '../../config/api';
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

interface ProjectForm {
    title: string;
    description: string;
    githubLink: string;
    readme: string;
    status: 'success' | 'in_progress' | 'archived' | 'abandoned';
}

const emptyForm: ProjectForm = {
    title: '',
    description: '',
    githubLink: '',
    readme: '',
    status: 'in_progress',
};

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

    const [modalOpen, setModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [form, setForm] = useState<ProjectForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const toast = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        const fetchProjects = async () => {
            if (!token) {
                setError(t('auth.genericError'));
                setLoading(false);
                return;
            }

            try {
                const response = await authorizedFetch(`${getApiUrl()}/api/projects`, token);
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
    }, [token, t]);

    const fetchRepos = async () => {
        if (!token) {
            setError(t('auth.genericError'));
            return;
        }
        setReposLoading(true);
        try {
            const response = await authorizedFetch(`${getApiUrl()}/api/projects/github/repos`, token);
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
            const response = await authorizedFetch(`${getApiUrl()}/api/projects/github/import`, token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: repo.name,
                    description: repo.description,
                    html_url: repo.html_url,
                    status
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || t('auth.genericError'));
            }
            const newProject: Project = {
                id: data.projectId,
                title: repo.name,
                description: repo.description || '',
                githubLink: repo.html_url,
                status: status as Project['status'],
                readme: ''
            };
            setProjects(prev => [newProject, ...prev]);
            setRepos(prev => prev.filter(r => r.id !== repo.id));
            toast.success(t('projects.created'));
        } catch (err: any) {
            toast.error(err.message || t('projects.saveError'));
        } finally {
            setImporting(null);
        }
    };

    const openCreate = () => {
        setEditingProject(null);
        setForm(emptyForm);
        setFormError(null);
        setModalOpen(true);
    };

    const openEdit = (project: Project) => {
        setEditingProject(project);
        setForm({
            title: project.title,
            description: project.description,
            githubLink: project.githubLink,
            readme: project.readme,
            status: project.status,
        });
        setFormError(null);
        setModalOpen(true);
    };

    const handleStatusChange = (id: number, newStatus: string) => {
        setProjects(prev =>
            prev.map(p =>
                p.id === id ? { ...p, status: newStatus as Project['status'] } : p
            )
        );
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!token || !form.title.trim()) return;
        setSaving(true);
        setFormError(null);
        try {
            const body = {
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                githubLink: form.githubLink.trim() || undefined,
                readme: form.readme.trim() || undefined,
                status: form.status,
            };
            const url = editingProject
                ? `${getApiUrl()}/api/projects/${editingProject.id}`
                : `${getApiUrl()}/api/projects`;
            const response = await authorizedFetch(url, token, {
                method: editingProject ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || t('projects.saveError'));
            }

            if (editingProject) {
                setProjects(prev =>
                    prev.map(p =>
                        p.id === editingProject.id
                            ? {
                                ...p,
                                title: body.title,
                                description: body.description || '',
                                githubLink: body.githubLink || '',
                                readme: body.readme || '',
                                status: body.status,
                            }
                            : p
                    )
                );
                toast.success(t('projects.updated'));
            } else {
                const newProject: Project = {
                    id: data.projectId,
                    title: body.title,
                    description: body.description || '',
                    githubLink: body.githubLink || '',
                    readme: body.readme || '',
                    status: body.status,
                };
                setProjects(prev => [newProject, ...prev]);
                toast.success(t('projects.created'));
            }
            setModalOpen(false);
        } catch (err: any) {
            setFormError(err.message || t('projects.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project: Project) => {
        if (!token) return;
        const ok = await confirm({
            title: t('projects.deleteProject'),
            message: t('projects.deleteConfirm'),
            confirmLabel: t('projects.deleteProject'),
            danger: true,
        });
        if (!ok) return;
        try {
            const response = await authorizedFetch(`${getApiUrl()}/api/projects/${project.id}`, token, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || t('projects.saveError'));
            }
            setProjects(prev => prev.filter(p => p.id !== project.id));
            toast.success(t('projects.deleted'));
        } catch (err: any) {
            toast.error(err.message || t('projects.saveError'));
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
        { value: 'in_progress', label: t('projects.enCours'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        { value: 'success', label: t('projects.reussi'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        { value: 'archived', label: t('projects.classe'), color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400' },
        { value: 'abandoned', label: t('projects.abandonne'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('projects.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('projects.subtitle')}
                    </p>
                </div>
                <button onClick={openCreate} className="btn-primary text-sm whitespace-nowrap w-full sm:w-auto">
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t('projects.newProject')}
                    </span>
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-surface-800 rounded-xl">
                <button
                    onClick={() => setTab('saved')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === 'saved'
                            ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-brand-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    {t('projects.myProjects')} ({projects.length})
                </button>
                <button
                    onClick={() => setTab('github')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === 'github'
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
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${filter === sf.value
                                            ? 'bg-brand-600 text-white shadow-glow'
                                            : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700'
                                        }`}
                                >
                                    {sf.label}
                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs ${filter === sf.value
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
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setTab('github')}
                                    className="btn-secondary text-sm"
                                >
                                    {t('projects.viewGithub')}
                                </button>
                                <button onClick={openCreate} className="btn-primary text-sm">
                                    {t('projects.newProject')}
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && filteredProjects.length > 0 && (
                        <div className="grid gap-4">
                            {filteredProjects.map((project, index) => (
                                <div key={project.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <ProjectCard
                                        project={project}
                                        githubLinkText={t('projects.viewOnGithub')}
                                        onStatusChange={handleStatusChange}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                    />
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
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {repo.name}
                                                </h3>
                                                {repo.fork && (
                                                    <span className="badge bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400 text-[10px]">
                                                        {t('projects.fork')}
                                                    </span>
                                                )}
                                                {repo.language && (
                                                    <span className="badge bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px]">
                                                        {repo.language}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                                                {repo.description || t('projects.noDescription')}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    {repo.stargazers_count}
                                                </span>
                                                <span>{t('projects.updatedOn')} {new Date(repo.updated_at).toLocaleDateString('fr-FR')}</span>
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

                                        <div className="flex flex-row flex-wrap gap-1.5 sm:flex-col sm:flex-shrink-0">
                                            {statusOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => importRepo(repo, opt.value)}
                                                    disabled={importing === repo.id}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 ${importing === repo.id
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

            {modalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setModalOpen(false)} />
                    <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-float border border-gray-200 dark:border-surface-700 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-surface-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingProject ? t('projects.editProject') : t('projects.newProject')}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label={t('projects.cancel')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('projects.titleLabel')} *
                                </label>
                                <input
                                    id="project-title"
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('projects.descriptionLabel')}
                                </label>
                                <textarea
                                    id="project-description"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    className="input-field resize-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="project-link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('projects.githubLinkLabel')}
                                </label>
                                <input
                                    id="project-link"
                                    type="url"
                                    value={form.githubLink}
                                    onChange={(e) => setForm({ ...form, githubLink: e.target.value })}
                                    className="input-field"
                                    placeholder="https://github.com/..."
                                />
                            </div>

                            <div>
                                <label htmlFor="project-readme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('projects.readmeLabel')}
                                </label>
                                <textarea
                                    id="project-readme"
                                    value={form.readme}
                                    onChange={(e) => setForm({ ...form, readme: e.target.value })}
                                    rows={3}
                                    className="input-field resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('projects.statusLabel')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, status: opt.value as Project['status'] })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                                                form.status === opt.value
                                                    ? opt.color + ' ring-2 ring-brand-500/40 border-transparent'
                                                    : 'bg-white dark:bg-surface-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-surface-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary flex-1">
                                    {saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {editingProject ? t('projects.updating') : t('projects.creating')}
                                        </span>
                                    ) : (
                                        t(editingProject ? 'projects.save' : 'projects.create')
                                    )}
                                </button>
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn-ghost">
                                    {t('projects.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
