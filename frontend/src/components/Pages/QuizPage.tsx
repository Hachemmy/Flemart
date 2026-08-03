import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { getApiUrl } from "../../config/api";

interface QuizQuestion {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
}

interface QuizProgress {
  language: string;
  current_level: number;
  completed_levels: number;
  total_xp_earned: number;
}

export default function QuizPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [languages, setLanguages] = useState<string[]>([]);
  const [progress, setProgress] = useState<QuizProgress[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [levelResult, setLevelResult] = useState<{
    passed: boolean;
    xpEarned: number;
    message: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/quiz/languages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setLanguages(data.languages || []);
    } catch {}
  }, [token]);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/quiz/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProgress(data.progress || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchLanguages();
    fetchProgress();

    const onFocus = () => fetchProgress();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLanguages, fetchProgress]);

  const startQuiz = async (lang: string, level: number) => {
    setSelectedLang(lang);
    setSelectedLevel(level);
    setLoading(true);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setIsCorrect(null);
    setQuizComplete(false);
    setLevelResult(null);
    setScore(0);
    setTotalAnswered(0);
    setAnswerError(null);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/quiz/${encodeURIComponent(lang)}/questions?level=${level}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        setQuestions([]);
        return;
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (selectedAnswer || !questions[currentQ]) return;
    setAnswerError(null);
    setSelectedAnswer(answer);

    try {
      const res = await fetch(`${getApiUrl()}/api/quiz/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId: questions[currentQ].id, answer }),
      });
      if (!res.ok) throw new Error(t("quiz.answerError"));
      const data = await res.json();
      const correct = data.correct;
      setIsCorrect(correct);
      setCorrectAnswer(data.correctAnswer || null);
      if (correct) setScore((prev) => prev + 1);
      setTotalAnswered((prev) => prev + 1);
    } catch {
      setIsCorrect(null);
      setCorrectAnswer(null);
      setSelectedAnswer(null);
      setAnswerError(t("quiz.answerError"));
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      setIsCorrect(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizComplete(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/quiz/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: selectedLang,
          level: selectedLevel,
          score: score,
          totalAnswered: totalAnswered,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to complete quiz");
      }
      const data = await res.json();
      setLevelResult(data);
      await fetchProgress();
    } catch (e) {
      console.error("finishQuiz error:", e);
    }
  };

  const getProgressForLang = (lang: string) => {
    return progress.find((p) => p.language === lang);
  };

  const getOptionClass = (key: string) => {
    if (!selectedAnswer)
      return "border-gray-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 cursor-pointer";
    const correctKey = correctAnswer;
    if (key === correctKey)
      return "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600";
    if (key === selectedAnswer && !isCorrect)
      return "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600";
    return "border-gray-200 dark:border-surface-700 opacity-50";
  };

  const resetQuiz = async () => {
    await fetchProgress();
    setSelectedLang(null);
    setSelectedLevel(null);
    setQuestions([]);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setCorrectAnswer(null);
    setIsCorrect(null);
    setQuizComplete(false);
    setLevelResult(null);
    setScore(0);
    setTotalAnswered(0);
    setAnswerError(null);
  };

  const optionKeys = ["a", "b", "c", "d"];

  const goToNextLevel = () => {
    if (selectedLang && selectedLevel) {
      startQuiz(selectedLang, selectedLevel + 1);
    }
  };

  if (selectedLang && selectedLevel) {
    return (
      <div className="space-y-6 pb-16 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedLang} — {t("quiz.level")} {selectedLevel}
            </h1>
          </div>
          <button
            onClick={resetQuiz}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t("quiz.back")}
          </button>
        </div>

        {loading && (
          <div className="card p-6">
            <div className="skeleton h-5 w-3/4 mb-4" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        )}

        {!loading && questions.length === 0 && !quizComplete && (
          <div className="card p-12 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {t("quiz.noQuestions")}
            </p>
          </div>
        )}

        {!loading && !quizComplete && questions.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("quiz.question")} {currentQ + 1}/{questions.length}
              </span>
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                {score}/{totalAnswered} {t("quiz.correct")}
              </span>            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {questions[currentQ].question}
            </h2>

            <div className="space-y-3">
              {optionKeys.map((key) => {
                const val = questions[currentQ][
                  `option_${key}` as keyof QuizQuestion
                ] as string;
                return (
                  <button
                    key={key}
                    onClick={() => submitAnswer(key)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${getOptionClass(key)}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {key.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {val}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {answerError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium animate-slide-down">
                {answerError}
              </div>
            )}

            {selectedAnswer && (
              <div className="mt-6 animate-slide-up">
                <div
                  className={`p-3 rounded-xl mb-4 text-sm font-medium ${
                    isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30"
                  }`}
                >
                  {isCorrect ? t("quiz.correctAnswer") : t("quiz.wrongAnswer")}
                </div>
                <div className="flex justify-end">
                  {currentQ < questions.length - 1 ? (
                    <button onClick={nextQuestion} className="btn-primary">
                      {t("quiz.nextQuestion")}
                    </button>
                  ) : (
                    <button onClick={finishQuiz} className="btn-primary">
                      {t("quiz.seeResults")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {quizComplete && (
          <div className="card p-8 text-center animate-scale-in">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                levelResult?.passed
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              {levelResult?.passed ? (
                <svg
                  className="w-10 h-10 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {levelResult?.passed ? t("quiz.passed") : t("quiz.failed")}
            </h2>

            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t("quiz.score")} : {score}/{questions.length || 1}
            </p>

            {levelResult?.passed ? (
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-6">
                +{levelResult.xpEarned} {t("quiz.xpEarned")}
              </p>
            ) : (
              <p className="text-red-600 dark:text-red-400 font-medium mb-6">
                {t("quiz.passedMessage")}
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startQuiz(selectedLang!, selectedLevel!)}
                className="btn-secondary"
              >
                {t("quiz.retry")}
              </button>
              {levelResult?.passed && selectedLevel! < 100 && (
                <button onClick={goToNextLevel} className="btn-primary">
                  {t("quiz.nextLevel")}
                </button>
              )}
              <button onClick={resetQuiz} className="btn-primary">
                {t("quiz.backToLevels")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("languageGame.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t("quiz.selectLevel")}
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-6 w-24 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && languages.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("learning.noResourcesHint")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {languages.map((lang) => {
          const prog = getProgressForLang(lang);
          const completedLevels = prog?.completed_levels || 0;
          const currentLevel = prog?.current_level || 1;
          const totalXp = prog?.total_xp_earned || 0;

          return (
            <div key={lang} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {lang}
                </h3>
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                  {totalXp} XP
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("quiz.level")} {currentLevel} — {completedLevels}/100{" "}
                {t("quiz.complete")}
              </p>
              <div className="h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${completedLevels}%` }}
                />
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-10 gap-1">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((level) => {
                  const isUnlocked = level <= currentLevel;
                  const isCompleted = level <= completedLevels;
                  return (
                    <button
                      key={level}
                      onClick={() => isUnlocked && startQuiz(lang, level)}
                      disabled={!isUnlocked}
                      title={`Niveau ${level}`}
                      className={`aspect-square rounded text-[9px] font-bold transition-all flex items-center justify-center ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isUnlocked
                            ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-800/40"
                            : "bg-gray-100 dark:bg-surface-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
