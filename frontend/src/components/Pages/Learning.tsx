import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { getApiUrl } from '../../config/api';

interface LearningResource {
    id: number;
    language: string;
    title: string;
    logo: string;
    link: string;
    description: string;
}

interface WebResult {
    title: string;
    url: string;
    snippet: string;
}

interface VideoResult {
    title: string;
    url: string;
    videoId: string;
    thumbnail: string;
    channel: string;
    views: string;
    duration: string;
}

export default function Learning() {
    const { t } = useI18n();
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [webResults, setWebResults] = useState<WebResult[]>([]);
    const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/api/learning`);
                if (!response.ok) throw new Error(t('auth.genericError'));
                const { resources } = await response.json();
                setResources(resources as LearningResource[]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, []);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        setHasSearched(true);
        setWebResults([]);
        setVideoResults([]);
        setSearchError(null);
        try {
            const response = await fetch(`${getApiUrl()}/api/learning/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchTerm }),
            });
            if (!response.ok) throw new Error('search failed');
            const { results, videos } = await response.json();
            setWebResults(results || []);
            setVideoResults(videos || []);
        } catch {
            setWebResults([]);
            setVideoResults([]);
            setSearchError(t('learning.searchError'));
        } finally {
            setIsSearching(false);
        }
    };

    const getHostname = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    return (
        <div className="space-y-8 pb-16 animate-fade-in">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {t('learning.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {t('learning.subtitle')}
                </p>
            </div>

            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    {t('learning.search')}
                </h2>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={t('learning.searchPlaceholder')}
                        className="input-field flex-1"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="btn-primary whitespace-nowrap"
                    >
                        {isSearching ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {t('learning.searching')}
                            </span>
                        ) : t('learning.searchButton')}
                    </button>
                </div>

                {searchError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {searchError}
                    </div>
                )}

                {isSearching && (
                    <div className="mt-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card p-5">
                                <div className="skeleton h-4 w-48 mb-2" />
                                <div className="skeleton h-3 w-full mb-1" />
                                <div className="skeleton h-3 w-3/4" />
                            </div>
                        ))}
                    </div>
                )}

                {!isSearching && hasSearched && webResults.length === 0 && videoResults.length === 0 && (
                    <div className="mt-6 card p-8 text-center">
                        <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">{t('learning.noResult')}</p>
                    </div>
                )}

                {!isSearching && (webResults.length > 0 || videoResults.length > 0) && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Left: Web links */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                </svg>
                                {t('learning.webResults') || 'Liens'}
                            </h3>
                            {webResults.length === 0 && (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('learning.noWebResults') || 'Aucun lien trouvé'}</p>
                            )}
                            {webResults.map((result, index) => (
                                <a
                                    key={index}
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block card p-4 hover:border-brand-200 dark:hover:border-brand-800/50 transition-all duration-200 group animate-slide-up"
                                    style={{ animationDelay: `${index * 40}ms` }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-brand-600 dark:text-brand-400 mb-1">
                                                {getHostname(result.url)}
                                            </p>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors mb-1 line-clamp-1">
                                                {result.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {result.snippet}
                                            </p>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* Right: YouTube videos */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                {t('learning.videoResults') || 'Vidéos YouTube'}
                            </h3>
                            {videoResults.length === 0 && (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('learning.noVideoResults') || 'Aucune vidéo trouvée'}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {videoResults.map((video, index) => (
                                    <a
                                        key={index}
                                        href={video.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block card overflow-hidden hover:border-brand-200 dark:hover:border-brand-800/50 transition-all duration-200 group animate-slide-up"
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <div className="relative">
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-28 object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                                                }}
                                            />
                                            {video.duration && (
                                                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                                                    {video.duration}
                                                </span>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                                                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors line-clamp-2 mb-1">
                                                {video.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {video.channel}
                                                {video.views && ` · ${video.views} ${t('learning.views')}`}
                                            </p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    {t('learning.sites')}
                </h2>

                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="card p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="skeleton w-10 h-10 rounded-xl" />
                                    <div className="space-y-2 flex-1">
                                        <div className="skeleton h-4 w-24" />
                                        <div className="skeleton h-3 w-16" />
                                    </div>
                                </div>
                                <div className="skeleton h-3 w-full mb-2" />
                                <div className="skeleton h-3 w-3/4" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="card p-6 border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10">
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && resources.length === 0 && (
                    <div className="card p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-surface-700 rounded-2xl mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {t('learning.noResources')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('learning.noResourcesHint')}
                        </p>
                    </div>
                )}

                {!loading && !error && resources.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {resources.map((resource, index) => (
                            <a
                                key={resource.id}
                                href={resource.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card p-5 group hover:scale-[1.02] transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        <img
                                            src={resource.logo}
                                            alt={resource.title}
                                            className="w-6 h-6 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                                            {resource.title}
                                        </h3>
                                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
                                            {resource.language}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                    {resource.description}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 group-hover:gap-2.5 transition-all">
                                    {t('learning.visitSite')}
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
