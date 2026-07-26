import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl } from "../../config/api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword, username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("auth.registerFailed"));
      }
      login(data.user, data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.message || t("auth.genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubRegister = () => {
    window.location.href = `${getApiUrl()}/api/auth/github`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-900 p-5">
      <div className="flex w-full max-w-[960px] bg-white dark:bg-surface-800 rounded-[24px] shadow-card overflow-hidden animate-scale-in">
        {/* Left - Brand */}
        <div className="hidden lg:flex lg:w-[420px] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 relative overflow-hidden flex-col justify-center p-10">
          <div className="absolute inset-0">
            <div className="absolute top-16 left-10 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl animate-float" />
            <div
              className="absolute bottom-16 right-10 w-72 h-72 bg-brand-400/15 rounded-full blur-3xl animate-float"
              style={{ animationDelay: "3s" }}
            />
          </div>
          <div className="relative z-10 space-y-6">
            <div
              className="animate-slide-in-left"
              style={{ animationDelay: "0.1s", animationFillMode: "both" }}
            >
              <div className="flex justify-center gap-3 mb-4">
                <img
                  src="/ZZZ.png"
                  alt="Flem'Art"
                  className="w-40 h-40 rounded-3xl"
                />
              </div>
            </div>
            <div
              className="animate-slide-in-left"
              style={{ animationDelay: "0.2s", animationFillMode: "both" }}
            >
              <h1 className="text-3xl font-bold text-white leading-tight">
                {t("auth.shareProjects")}
              </h1>
            </div>
            <div
              className="animate-slide-in-left"
              style={{ animationDelay: "0.3s", animationFillMode: "both" }}
            >
              <p className="text-brand-200 text-sm leading-relaxed">
                {t("auth.joinCommunity")}
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <div
                className="flex items-center gap-3 animate-slide-in-left"
                style={{ animationDelay: "0.4s", animationFillMode: "both" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-brand-100 text-sm">
                  {t("auth.trackProgress")}
                </span>
              </div>
              <div
                className="flex items-center gap-3 animate-slide-in-left"
                style={{ animationDelay: "0.5s", animationFillMode: "both" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-brand-100 text-sm">
                  {t("auth.connectGithub")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-14">
          {/* Mobile logo */}
          <div
            className="lg:hidden flex justify-center gap-3 mb-10 animate-slide-in-right"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <img
              src="/ZZZ.png"
              alt="Flem'Art"
              className="w-32 h-32 rounded-3xl"
            />
          </div>

          <div className="w-full max-w-[420px] mx-auto space-y-5">
            <div
              className="animate-slide-in-right"
              style={{ animationDelay: "0.2s", animationFillMode: "both" }}
            >
              <h1 className="text-[32px] leading-[40px] font-bold text-gray-900 dark:text-white">
                {t("auth.register")}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                {t("auth.startJourney")}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center animate-slide-down">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div
                className="animate-slide-in-right"
                style={{ animationDelay: "0.3s", animationFillMode: "both" }}
              >
                <div className="flex h-[72px] flex-col justify-center rounded-xl border border-gray-200 dark:border-surface-700 px-4 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-200">
                  <label className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("auth.username")}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border-none shadow-none p-0 text-gray-900 dark:text-white bg-transparent outline-none text-sm mt-0.5 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="username"
                    required
                  />
                </div>
              </div>

              <div
                className="animate-slide-in-right"
                style={{ animationDelay: "0.4s", animationFillMode: "both" }}
              >
                <div className="flex h-[72px] flex-col justify-center rounded-xl border border-gray-200 dark:border-surface-700 px-4 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-200">
                  <label className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("auth.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-none shadow-none p-0 text-gray-900 dark:text-white bg-transparent outline-none text-sm mt-0.5 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div
                className="animate-slide-in-right"
                style={{ animationDelay: "0.5s", animationFillMode: "both" }}
              >
                <div className="flex h-[72px] flex-col justify-center rounded-xl border border-gray-200 dark:border-surface-700 px-4 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-200">
                  <label className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("auth.password")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-none shadow-none p-0 text-gray-900 dark:text-white bg-transparent outline-none text-sm mt-0.5 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div
                className="animate-slide-in-right"
                style={{ animationDelay: "0.6s", animationFillMode: "both" }}
              >
                <div className="flex h-[72px] flex-col justify-center rounded-xl border border-gray-200 dark:border-surface-700 px-4 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-200">
                  <label className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("auth.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border-none shadow-none p-0 text-gray-900 dark:text-white bg-transparent outline-none text-sm mt-0.5 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div
                className="animate-slide-in-right"
                style={{ animationDelay: "0.7s", animationFillMode: "both" }}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[66px] bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-3 hover:shadow-glow"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  ) : (
                    t("auth.registerButton")
                  )}
                </button>
              </div>
            </form>

            <div
              className="relative my-5 animate-fade-in"
              style={{ animationDelay: "0.8s", animationFillMode: "both" }}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-surface-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-surface-800 text-gray-400 uppercase tracking-wider text-xs font-medium">
                  ou
                </span>
              </div>
            </div>

            <div
              className="animate-slide-in-right"
              style={{ animationDelay: "0.9s", animationFillMode: "both" }}
            >
              <button
                onClick={handleGithubRegister}
                className="w-full h-[66px] flex items-center justify-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {t("auth.registerWithGithub")}
              </button>
            </div>

            <div
              className="animate-fade-in"
              style={{ animationDelay: "1s", animationFillMode: "both" }}
            >
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t("auth.hasAccount")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors"
                >
                  {t("auth.signIn")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
