import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Building2,
  TriangleAlert,
  FileText,
  Settings,
  ChevronLeft,
  UserCircle,
  Sun,
  Moon,
  Server,
  Users,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import logo from "../../assets/logo.png";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext"; // <--- Импорт Auth
import { ROLES } from "../../config/env";

// НАСТРОЙКА ДОСТУПА
// НАШ ЕДИНЫЙ СТАНДАРТ РОЛЕЙ
// SUPER_ADMIN - Бог
// ADMIN - Техник, установщик
// MCHS_USER - МЧС (Наблюдатель)
// ORG_OPERATOR - Оператор здания
// MAP_OPERATOR - Только интерактивная карта
// HAZARD_OPERATOR - Только карта угроз

const navItems = [
  {
    path: "/",
    icon: LayoutDashboard,
    label: "Панель мониторинга",
    roles: [ROLES.SUPER_ADMIN, ROLES.MCHS_USER], // Только МЧС и Супер-Админ видят общую сводку
  },
  {
    path: "/map",
    icon: Map,
    label: "Интерактивная карта",
    roles: [ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.MAP_OPERATOR], // Роль карты + МЧС + супер-админ
  },
  {
    path: "/hazards",
    icon: TriangleAlert,
    label: "Карта угроз",
    roles: [ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.HAZARD_OPERATOR], // Роль угроз + МЧС + супер-админ
  },
  {
    path: "/incidents",
    icon: TriangleAlert,
    label: "Инциденты",
    roles: [ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN], // Журнал тревог
  },
  {
    path: "/operators",
    icon: Users,
    label: "Персонал",
    roles: [ROLES.SUPER_ADMIN], // Управлять всеми может только Супер-Админ
  },
  {
    path: "/organizations",
    icon: Building2,
    label: "Организации",
    roles: [ROLES.SUPER_ADMIN], // Управлять организациями - тоже
  },
  {
    path: "/devices",
    icon: Server,
    label: "Оборудование",
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER], // Супер-админ, админ и МЧС видят все устройства
  },
  {
    path: "/operator-dashboard",
    icon: Building2,
    label: "Мои устройства",
    roles: [ROLES.ORG_OPERATOR], // Операторы видят только свои устройства
  },
  {
    path: "/reports",
    icon: FileText,
    label: "Отчеты",
    roles: [ROLES.SUPER_ADMIN, ROLES.MCHS_USER], // Отчеты для МЧС
  },
  {
    path: "/audit-logs",
    icon: ClipboardList,
    label: "Audit logs",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    path: "/settings",
    icon: Settings,
    label: "Настройки",
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER, ROLES.ORG_OPERATOR], // Новые роли не имеют доступ к настройкам
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, checkRole } = useAuth(); // <--- Берем пользователя и функцию проверки

  return (
    <motion.aside
      initial={{ width: 260 }}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="glass-panel h-screen relative flex flex-col z-50 border-r border-border"
    >
      {/* HEADER */}
      <div className="h-20 flex items-center justify-center border-b border-border/50 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="logo"
            className="w-18 h-18 object-contain transition-all duration-300"
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg tracking-wider text-text-main whitespace-nowrap overflow-hidden"
              >
                МИСМ{" "}
                <span className="text-brand-blue drop-shadow-[0_0_10px_rgba(0,170,255,0.5)]">
                  МЧС
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-surface border border-border text-text-muted p-1.5 rounded-full shadow-lg hover:text-text-main hover:bg-brand-blue hover:border-brand-blue transition-all z-50"
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronLeft size={14} />
        </motion.div>
      </button>

      {/* НАВИГАЦИЯ С ФИЛЬТРОМ РОЛЕЙ */}
      <nav className="flex-1 px-3 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          // ЕСЛИ У ПОЛЬЗОВАТЕЛЯ НЕТ ПРАВ НА ЭТУ КНОПКУ -> НЕ РИСУЕМ ЕЁ
          if (!checkRole(item.roles)) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden whitespace-nowrap relative",
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue shadow-inner border border-brand-blue/20"
                    : "text-text-muted hover:bg-surface-hover hover:text-text-main hover:shadow-md"
                )
              }
            >
              <div className="min-w-[24px] flex justify-center">
                <item.icon
                  size={22}
                  className={clsx("transition-colors", collapsed && "mx-auto")}
                />
              </div>
              <motion.span
                animate={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                }}
                className="font-medium text-sm"
              >
                {item.label}
              </motion.span>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-blue rounded-r-full opacity-0 transition-opacity duration-300 group-[.active]:opacity-100" />
            </NavLink>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-border mt-auto flex flex-col gap-4 bg-surface/50">
        <button
          onClick={toggleTheme}
          className={clsx(
            "flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-all text-text-muted hover:text-text-main border border-transparent hover:border-border",
            collapsed ? "justify-center" : ""
          )}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span className="text-sm font-medium">
              {theme === "dark" ? "Светлая тема" : "Темная тема"}
            </span>
          )}
        </button>

        <div
          className={clsx(
            "flex items-center gap-3 transition-all p-1",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center border border-border text-text-muted">
              <UserCircle size={32} />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-bg-app"></div>
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-sm font-bold text-text-main truncate">
                {user?.fullName || user?.username}
              </span>
              <span className="text-xs text-text-muted truncate">
                {user?.role}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
