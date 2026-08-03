import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import ThemeToggle from "../UI/ThemeToggle";
import LanguageToggle from "../UI/LanguageToggle";

export default function Landing() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-surface-900">
      {/* Toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Hero */}
      <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-10 right-1/4 w-96 h-96 bg-brand-400/15 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "3s" }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto px-6 py-20 text-center">
          <div
            className="flex justify-center mb-8 animate-slide-in-top"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <img
              src="/ZZZ.png"
              alt="Flem'Art"
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl shadow-float"
            />
          </div>

          <h1
            className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 animate-slide-in-top"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            {t("landing.heroTitle")}
          </h1>

          <p
            className="text-brand-100 text-base sm:text-lg max-w-2xl mx-auto mb-10 animate-slide-in-top"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            {t("landing.heroSubtitle")}
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-top"
            style={{ animationDelay: "0.4s", animationFillMode: "both" }}
          >
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white text-brand-800 font-semibold rounded-full hover:bg-brand-50 active:scale-[0.98] transition-all duration-200 hover:shadow-glow"
            >
              {t("auth.login")}
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 bg-brand-600/60 backdrop-blur border border-brand-400/40 text-white font-semibold rounded-full hover:bg-brand-600/80 active:scale-[0.98] transition-all duration-200"
            >
              {t("auth.register")}
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 sm:py-20">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 animate-slide-in-top"
          style={{ animationDelay: "0.1s", animationFillMode: "both" }}
        >
          {t("landing.featuresTitle")}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              ),
              title: t("landing.featureProjects"),
              desc: t("landing.featureProjectsDesc"),
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              ),
              title: t("landing.featureLearning"),
              desc: t("landing.featureLearningDesc"),
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959V6a2 2 0 00-2-2H6a2 2 0 00-2 2v.217c0 .355.186.676.401.959.221.29.349.634.349 1.003 0 1.036-1.007 1.875-2.25 1.875S2.5 8.606 2.5 7.57c0-.369.128-.713.349-1.003.215-.283.401-.604.401-.959V4a2 2 0 012-2h2a2 2 0 012 2v.217z"
                />
              ),
              title: t("landing.featureQuiz"),
              desc: t("landing.featureQuizDesc"),
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
                />
              ),
              title: t("landing.featureAssistant"),
              desc: t("landing.featureAssistantDesc"),
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              ),
              title: t("landing.featureProgress"),
              desc: t("landing.featureProgressDesc"),
            },
            {
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
                />
              ),
              title: t("landing.featureCommunity"),
              desc: t("landing.featureCommunityDesc"),
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white dark:bg-surface-800 rounded-2xl border border-gray-200 dark:border-surface-700 shadow-sm p-6 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 animate-slide-in-top"
              style={{ animationDelay: `${0.15 + i * 0.05}s`, animationFillMode: "both" }}
            >
              <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-brand-600 dark:text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-4 animate-slide-in-top"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mb-8">
            {t("landing.ctaSubtitle")}
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-brand-800 font-semibold rounded-full hover:bg-brand-50 active:scale-[0.98] transition-all duration-200 hover:shadow-glow"
          >
            {t("landing.ctaButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}
