import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl } from "../../config/api";

interface NotificationItem {
  id: number;
  type: "activity" | "motivation";
  message: string;
  is_read: number;
  created_timestamp: number;
  actor_id: number | null;
  actor_username: string | null;
  actor_photo: string | null;
}

const typeConfig: Record<string, { color: string; bg: string; label: string }> =
  {
    activity: {
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      label: "Activite",
    },
    motivation: {
      color: "text-green-500",
      bg: "bg-green-100 dark:bg-green-900/30",
      label: "Encouragement",
    },
  };

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "a l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return `il y a ${Math.floor(diff / 604800)}sem`;
}

export default function Notification() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${getApiUrl()}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let detail = "";
        try {
          const body = await response.json();
          detail = body?.error || "";
        } catch {
          /* response wasn't JSON */
        }
        throw new Error(
          detail
            ? `Erreur (${response.status}) : ${detail}`
            : `Erreur (${response.status})`,
        );
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err: any) {
      setError(
        err.message || "Erreur réseau : impossible de contacter le serveur",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!showMenu) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [showMenu, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setExpandedId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAsRead(id: number) {
    try {
      await fetch(`${getApiUrl()}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch(`${getApiUrl()}/api/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  }

  async function deleteNotification(id: number) {
    if (!window.confirm(t("notification.confirmDelete"))) return;
    try {
      await fetch(`${getApiUrl()}/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {}
  }

  function handleNotifClick(notif: NotificationItem) {
    if (expandedId === notif.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notif.id);
      if (!notif.is_read) markAsRead(notif.id);
    }
  }

  function close() {
    setShowMenu(false);
    setExpandedId(null);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setShowMenu(!showMenu);
          setExpandedId(null);
        }}
        className="relative p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700 transition-all duration-200 active:scale-95"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] sm:text-[11px] font-bold text-white bg-red-500 rounded-full shadow-lg ring-2 ring-white dark:ring-surface-800">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[59] sm:hidden"
            onClick={close}
          />
          <div className="fixed inset-0 z-[60] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[420px] sm:max-h-[80vh] sm:rounded-2xl bg-white dark:bg-surface-800 sm:border border-gray-200 dark:border-surface-700 sm:shadow-2xl flex flex-col">
            <div className="p-4 sm:p-5 border-b border-gray-200/50 dark:border-surface-700/50 bg-gray-50/50 dark:bg-surface-900/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t("notification.title")}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs sm:text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Tout marquer lu
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="inline-block text-xs sm:text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full">
                  {unreadCount} {t("notification.unread")}
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-surface-700/50">
              {loading && (
                <div className="p-4 sm:p-5 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-surface-700 animate-pulse flex-shrink-0" />
                      <div className="space-y-2.5 flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-surface-700 rounded animate-pulse w-full" />
                        <div className="h-3 bg-gray-200 dark:bg-surface-700 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="p-4 sm:p-5 text-sm text-red-500">{error}</p>
              )}

              {!loading && !error && notifications.length === 0 && (
                <div className="px-4 sm:px-5 py-12 sm:py-16 text-center">
                  <svg
                    className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                  <p className="text-sm sm:text-base text-gray-400 dark:text-gray-500 font-medium">
                    {t("notification.none")}
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                notifications.map((notif) => {
                  const config = typeConfig[notif.type] || {
                    color: "text-gray-500",
                    bg: "bg-gray-100",
                    label: notif.type,
                  };
                  const isExpanded = expandedId === notif.id;
                  return (
                    <div key={notif.id}>
                      <button
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-surface-700/30 transition-colors ${
                          !notif.is_read
                            ? "bg-brand-50/50 dark:bg-brand-900/10"
                            : ""
                        }`}
                      >
                        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-surface-700">
                          {notif.actor_photo ? (
                            <img
                              src={notif.actor_photo}
                              alt={notif.actor_username || ""}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : null}
                          <svg
                            className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 ${notif.actor_photo ? "hidden" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${config.color}`}
                            >
                              {config.label}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                              {timeAgo(notif.created_timestamp)}
                            </span>
                          </div>
                          <p
                            className={`text-sm sm:text-[15px] leading-relaxed ${isExpanded ? "" : "line-clamp-2"} ${
                              !notif.is_read
                                ? "text-gray-900 dark:text-white font-medium"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {notif.message}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          {!notif.is_read && (
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-500 rounded-full" />
                          )}
                          <svg
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                            />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-3 sm:pb-4 pt-0 animate-slide-down">
                          <div className="bg-gray-50 dark:bg-surface-900 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-surface-700">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(
                                    notif.created_timestamp * 1000,
                                  ).toLocaleString("fr-FR")}
                                </span>
                                {notif.actor_username && (
                                  <span className="text-[10px] sm:text-xs text-brand-600 dark:text-brand-400 font-medium">
                                    {notif.actor_username}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title={t("notification.confirmDelete")}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
