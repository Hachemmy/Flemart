import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl } from "../../config/api";
import {
  HeartIcon,
  ArrowUpRightIcon,
  PlayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

const API_URL = getApiUrl();

interface FeedProject {
  id: number;
  title: string;
  description: string | null;
  readme: string | null;
  github_link: string | null;
  status: "in_progress" | "success" | "archived" | "abandoned";
  created_at: string;
  updated_at: string;
  username: string;
  photo: string | null;
  like_count: number;
  user_liked: boolean;
}

export default function Home() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedReadme, setExpandedReadme] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchFeed();
  }, [token]);

  async function fetchFeed() {
    try {
      const res = await fetch(`${API_URL}/api/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProjects(data.projects || []);
      setFeedError(null);
    } catch {
      setProjects([]);
      setFeedError(t("home.feedError"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(projectId: number) {
    if (actionLoading) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const previousLiked = project.user_liked;
    const previousCount = project.like_count;

    setActionLoading(projectId);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
            ...p,
            user_liked: !previousLiked,
            like_count: previousLiked ? previousCount - 1 : previousCount + 1,
          }
          : p,
      ),
    );

    try {
      const res = await fetch(`${API_URL}/api/feed/${projectId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, user_liked: previousLiked, like_count: previousCount }
              : p,
          ),
        );
        return;
      }
      const data = await res.json();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
              ...p,
              user_liked: data.liked,
              like_count: data.liked ? previousCount + 1 : previousCount - 1,
            }
            : p,
        ),
      );
    } catch {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, user_liked: previousLiked, like_count: previousCount }
            : p,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function resumeProject(projectId: number) {
    if (actionLoading) return;
    setActionLoading(projectId);
    try {
      const res = await fetch(`${API_URL}/api/feed/${projectId}/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } finally {
      setActionLoading(null);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      success: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-300",
        label: t("status.success"),
      },
      abandoned: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-300",
        label: t("status.abandoned"),
      },
    };
    const s = map[status] || {
      bg: "bg-gray-100",
      text: "text-gray-600",
      label: status,
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
      >
        {s.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-gray-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>{t("home.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 mb-24">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("home.title")}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t("home.subtitle")}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-32">
          {feedError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl max-w-md mx-auto">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                {feedError}
              </p>
            </div>
          ) : (
            <>
              <HeartIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t("home.noProjects")}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 shadow-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {project.photo ? (
                      <img
                        src={project.photo}
                        alt={project.username}
                        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                          {project.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {project.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t("home.by")} {project.username}
                      </p>
                    </div>
                  </div>
                  {statusBadge(project.status)}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {project.title}
                </h3>

                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {project.readme && (
                  <div className="mb-3">
                    <p
                      className={`text-sm text-gray-500 dark:text-gray-400 italic leading-relaxed ${expandedReadme === project.id ? "" : "line-clamp-2"}`}
                    >
                      {project.readme}
                    </p>
                    <button
                      onClick={() =>
                        setExpandedReadme(
                          expandedReadme === project.id ? null : project.id,
                        )
                      }
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline mt-1"
                    >
                      {expandedReadme === project.id
                        ? t("home.readmeLess")
                        : t("home.readmeMore")}
                    </button>
                  </div>
                )}

                {project.github_link && (
                  <a
                    href={project.github_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline mb-3"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    {t("projects.viewOnGithub")}
                    <ArrowUpRightIcon className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="px-5 py-3 bg-gray-50 dark:bg-surface-900 border-t border-gray-100 dark:border-surface-700 flex items-center gap-3">
                <button
                  onClick={() => toggleLike(project.id)}
                  disabled={actionLoading === project.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${project.user_liked
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      : "bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700 border border-gray-200 dark:border-surface-600"
                    }`}
                >
                  {project.user_liked ? (
                    <HeartIconSolid className="h-4 w-4" />
                  ) : (
                    <HeartIcon className="h-4 w-4" />
                  )}
                  {project.like_count > 0 ? project.like_count : ""}
                </button>

                {project.status === "abandoned" && (
                  <button
                    onClick={() => resumeProject(project.id)}
                    disabled={actionLoading === project.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    <PlayIcon className="h-4 w-4" />
                    {t("home.resume")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
