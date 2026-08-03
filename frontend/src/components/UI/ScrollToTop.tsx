import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../i18n";

const titleMap: Record<string, string> = {
  "/": "home.title",
  "/learning": "learning.title",
  "/projects": "projects.title",
  "/profile": "profile.title",
  "/quiz": "quiz.title",
  "/login": "auth.login",
  "/register": "auth.register",
};

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const key = titleMap[pathname];
    document.title = key ? `${t(key)} - Flem'Art` : "Flem'Art";
  }, [pathname, t]);

  return null;
}
