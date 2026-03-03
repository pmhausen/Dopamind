import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AppProvider } from "./context/AppContext";
import { I18nProvider } from "./i18n/I18nContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TimeTrackingProvider } from "./context/TimeTrackingContext";
import { MailProvider } from "./context/MailContext";
import { CalendarProvider } from "./context/CalendarContext";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import RewardToast from "./components/RewardToast";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import MailPage from "./pages/MailPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import SettingsPage from "./pages/SettingsPage";
import AchievementsPage from "./pages/AchievementsPage";

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppProvider>
              <TimeTrackingProvider>
                <MailProvider>
                  <CalendarProvider>
                    <div className="min-h-screen flex">
                      <Sidebar />
                      <div className="flex-1 flex flex-col min-w-0">
                        <Header />
                        <main className="flex-1 px-4 py-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
                          <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/tasks" element={<TasksPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/mail" element={<MailPage />} />
                            <Route path="/time" element={<TimeTrackingPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/achievements" element={<AchievementsPage />} />
                          </Routes>
                        </main>
                        <footer className="hidden md:block text-center py-4 text-[10px] text-muted-light dark:text-muted-dark">
                          Dopamind &middot; For the ADHD Community
                        </footer>
                      </div>
                      <MobileNav />
                      <RewardToast />
                    </div>
                  </CalendarProvider>
                </MailProvider>
              </TimeTrackingProvider>
            </AppProvider>
          </SettingsProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
