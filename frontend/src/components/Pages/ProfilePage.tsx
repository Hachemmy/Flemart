import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl } from "../../config/api";

export default function ProfilePage() {
  const { user, token, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || "");
  const [photo, setPhoto] = useState(user?.photo || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success === "github_linked") {
      setMessage({ type: "success", text: t("profile.githubLinkedSuccess") });
      window.history.replaceState({}, "", "/profile");
    } else if (error === "github_taken") {
      setMessage({ type: "error", text: t("profile.githubTaken") });
      window.history.replaceState({}, "", "/profile");
    } else if (error) {
      setMessage({ type: "error", text: t("profile.githubError") });
      window.history.replaceState({}, "", "/profile");
    }

    if (!token) return;

    fetch(`${getApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data) => {
        if (data.user && token) login(data.user, token);
      })
      .catch(() => { });
  }, [token, login, t]);

  const githubLinked = !!user?.github_id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t("profile.passwordMismatch") });
      return;
    }

    setLoading(true);
    try {
      const body: any = {};
      if (username !== user?.username) body.username = username;
      if (photo !== user?.photo) body.photo = photo || null;
      if (newPassword) {
        if (!currentPassword) {
          setMessage({
            type: "error",
            text: t("profile.currentPasswordRequired"),
          });
          setLoading(false);
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      if (Object.keys(body).length === 0) {
        setMessage({ type: "error", text: t("profile.noChanges") });
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("auth.genericError"));
      }

      login(data.user, data.token || token!);
      setMessage({ type: "success", text: t("profile.saved") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in mb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("profile.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t("profile.subtitle")}
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium animate-slide-down ${message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400"
            }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("profile.info")}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative group">
              {photo ? (
                <img
                  src={photo}
                  alt={t("profile.avatarAlt")}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-gray-200 dark:ring-surface-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold">
                  {username?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("profile.photoUrl")}
              </label>
              <input
                type="url"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                className="input-field text-sm"
                placeholder="https://exemple.com/photo.jpg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("auth.username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t("profile.emailDisabled")}
            </p>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("profile.changePassword")}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("profile.currentPassword")}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("profile.newPassword")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("profile.confirmNewPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("auth.connectGithub")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("profile.githubDescription")}
          </p>
          {githubLinked ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t("profile.githubLinked")}
              </span>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  const res = await fetch(
                    `${getApiUrl()}/api/auth/github/link`,
                    {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                    },
                  );
                  const data = await res.json();
                  if (res.ok && data.url) {
                    window.location.href = data.url;
                  } else {
                    setMessage({
                      type: "error",
                      text: t("profile.githubError"),
                    });
                  }
                } catch {
                  setMessage({
                    type: "error",
                    text: t("profile.githubError"),
                  });
                }
              }}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              {t("profile.connectGithubButton")}
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("profile.saving")}
              </span>
            ) : (
              t("profile.save")
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
          >
            {t("profile.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
