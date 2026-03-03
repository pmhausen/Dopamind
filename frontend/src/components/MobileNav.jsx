import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { Home, CheckSquare, Calendar, Mail, Clock } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: Home, key: "home" },
  { to: "/tasks", icon: CheckSquare, key: "tasks" },
  { to: "/calendar", icon: Calendar, key: "calendar" },
  { to: "/mail", icon: Mail, key: "mail" },
  { to: "/time", icon: Clock, key: "timeTracking" },
];

export default function MobileNav() {
  const { t } = useI18n();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card-light/90 dark:bg-card-dark/90 backdrop-blur-md border-t border-gray-200/50 dark:border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium transition-all ${
                isActive
                  ? "text-accent"
                  : "text-muted-light dark:text-muted-dark"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
