import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppProvider } from "./context/AppContext";
import { I18nProvider } from "./i18n/I18nContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TimeTrackingProvider } from "./context/TimeTrackingContext";
import { MailProvider } from "./context/MailContext";
import { CalendarProvider } from "./context/CalendarContext";
import { FocusTimerProvider } from "./context/FocusTimerContext";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import RewardToast from "./components/RewardToast";
import MicroConfettiManager from "./components/MicroConfettiManager";
import TaskTimerWidget from "./components/TaskTimerWidget";
import GlobalQuickAdd from "./components/GlobalQuickAdd";
import TriageModal from "./components/TriageModal";
import ActivityBridge from "./components/ActivityBridge";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import MailPage from "./pages/MailPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import TimeManagementPage from "./pages/TimeManagementPage";
import SettingsPage from "./pages/SettingsPage";
import AchievementsPage from "./pages/AchievementsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SetupPage from "./pages/SetupPage";
import AdminPage from "./pages/AdminPage";

function ProtectedRoute({ children }) {
  const { user, loading, setupNeeded } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent text-lg font-semibold">Dopamind</div>
      </div>
    );
  }
  if (setupNeeded) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading, setupNeeded } = useAuth();
  if (loading) return null;
  if (setupNeeded) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { user, loading, setupNeeded } = useAuth();
  if (loading) return null;
  if (setupNeeded) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function RegisterRoute({ children }) {
  const { user, loading, setupNeeded, registrationEnabled } = useAuth();
  if (loading) return null;
  if (setupNeeded) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  if (!registrationEnabled) return <Navigate to="/login" replace />;
  return children;
}

function SetupRoute({ children }) {
  const { loading, setupNeeded } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent text-lg font-semibold">Dopamind</div>
      </div>
    );
  }
  if (!setupNeeded) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  return (
    <SettingsProvider>
      <AppProvider>
        <TimeTrackingProvider>
          <MailProvider>
            <CalendarProvider>
              <FocusTimerProvider>
                <div className="min-h-screen flex">
                  <Sidebar />
                  <div className="flex-1 flex flex-col min-w-0">
                    <Header />
                    <main className="flex-1 px-4 py-6 pb-24 md:pb-6 max-w-7xl w-full mx-auto">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/mail" element={<MailPage />} />
                        <Route path="/time" element={<TimeTrackingPage />} />
                        <Route path="/zeitmanagement" element={<Navigate to="/time?tab=focus" replace />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/achievements" element={<AchievementsPage />} />
                        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                      </Routes>
                    </main>
                    <footer className="hidden md:block text-center py-4 text-[10px] text-muted-light dark:text-muted-dark">
                      Dopamind &middot; For the ADHD Community
                    </footer>
                  </div>
                  <MobileNav />
                  <RewardToast />
                  <MicroConfettiManager />
                  <TaskTimerWidget />
                  <GlobalQuickAdd />
                  <TriageModal />
                  <ActivityBridge />
                </div>
              </FocusTimerProvider>
            </CalendarProvider>
          </MailProvider>
        </TimeTrackingProvider>
      </AppProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/setup" element={<SetupRoute><SetupPage /></SetupRoute>} />
              <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
              <Route path="/register" element={<RegisterRoute><RegisterPage /></RegisterRoute>} />
              <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
