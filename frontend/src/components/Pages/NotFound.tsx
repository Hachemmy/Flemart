import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="max-w-lg mx-auto text-center py-24 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-3xl mb-6">
        <svg className="w-10 h-10 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      </div>
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-2">404</p>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {t("notFound.title")}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {t("notFound.subtitle")}
      </p>
      <Link to="/" className="btn-primary inline-flex">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
