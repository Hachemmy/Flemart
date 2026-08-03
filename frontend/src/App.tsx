import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Home from "./components/Pages/Home";
import Learning from "./components/Pages/Learning";
import Projects from "./components/Pages/Projects";
import ProfilePage from "./components/Pages/ProfilePage";
import QuizPage from "./components/Pages/QuizPage";
import Landing from "./components/Pages/Landing";
import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";
import ChatWidget from "./components/UI/ChatWidget";

function App() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-surface-900">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <img src="/ZZZ.png" alt="Flem'Art" className="w-16 h-16 rounded-2xl" />
          <div className="w-8 h-8 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-surface-900 text-gray-900 dark:text-gray-100">
      {user ? (
        <>
          <Header />
          <main className="flex-1 p-3 sm:p-6 pb-20 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/learning" element={<Learning />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
          <Footer />
          <ChatWidget />
        </>
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
