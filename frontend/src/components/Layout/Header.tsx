import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import Notification from "../UI/Notification";
import Profile from "../UI/Profile";
import ThemeToggle from "../UI/ThemeToggle";
import LanguageToggle from "../UI/LanguageToggle";

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass border-b border-gray-200/50 dark:border-surface-700/50">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3">
        <Link to="/" className="flex justify-center gap-2 sm:gap-3 rounded-xl" aria-label={t("header.logo")}>
          <img
            src="/ZZZ.png"
            alt="Flem'Art"
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl transition-transform duration-200 hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Notification />

          <div className="relative">
            <button
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700 transition-all duration-200 active:scale-95"
              aria-label="Plus"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </button>
            {showPlusMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPlusMenu(false)}
                />
                <div className="dropdown w-64 p-2">
                  <button
                    onClick={() => {
                      navigate("/quiz");
                      setShowPlusMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959V6a2 2 0 00-2-2H6a2 2 0 00-2 2v.217c0 .355.186.676.401.959.221.29.349.634.349 1.003 0 1.036-1.007 1.875-2.25 1.875S2.5 8.606 2.5 7.57c0-.369.128-.713.349-1.003.215-.283.401-.604.401-.959V4a2 2 0 012-2h2a2 2 0 012 2v.217z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14.25 10.362v2.878c0 .355.186.676.401.959.221.29.349.634.349 1.003 0 1.036-1.007 1.875-2.25 1.875s-2.25-.84-2.25-1.875c0-.369.128-.713.349-1.003.215-.283.401-.604.401-.959v-2.878"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6.75 7.57c0-.369.128-.713.349-1.003.215-.283.401-.604.401-.959V4a2 2 0 00-2-2H3.75"
                      />
                    </svg>
                    {t("header.quiz")}
                  </button>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
                        />
                      </svg>
                      {t("header.theme")}
                    </span>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
                        />
                      </svg>
                      {t("header.language")}
                    </span>
                    <LanguageToggle />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-surface-700 mx-1" />

          <Profile user={user} onLogout={logout} />
        </div>
      </div>
    </header>
  );
}
