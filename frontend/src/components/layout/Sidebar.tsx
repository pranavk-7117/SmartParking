import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ParkingSquare,
  CircleDollarSign,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Tv,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Car,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { logout, currentUser } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Slot Management',
      path: '/slots',
      icon: ParkingSquare,
    },
    {
      label: 'Rate Configuration',
      path: '/rates',
      icon: CircleDollarSign,
    },
    {
      label: 'Session History',
      path: '/sessions',
      icon: ClipboardList,
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
    },
    {
      label: 'Operator Management',
      path: '/operators',
      icon: Users,
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-sidebar-bg text-white select-none">
      <div>
        { /* Header Logo Area */ }
        <div className="relative p-4 flex items-center border-b border-white/10 transition-all duration-200 ease-out">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 overflow-hidden text-left transition-all duration-200 ease-out ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
            onClick={onCloseMobile}
          >
            <div className="w-9 h-9 rounded-control bg-sidebar-active flex items-center justify-center shrink-0 shadow-md border border-white/20 transition-transform duration-200 ease-out hover:scale-[1.02]">
              <Car className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="transition-all duration-200 ease-out opacity-100 translate-x-0">
                <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
                  AeroPark
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-200 block">
                  Smart Parking System
                </span>
              </div>
            )}
          </Link>
        </div>


        { /* Navigation Items */ }
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({isActive}) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors group relative ${
                    isActive
                      ? 'bg-sidebar-active text-white font-semibold shadow-soft'
                      : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-neutral-900 text-white text-xs rounded shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      { /* Bottom Area: Kiosk link + Merged User Identity Block & Sign Out */ }
      <div className="p-3 border-t border-white/10 space-y-2">
        <Link
          to="/display"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-control text-xs font-medium text-amber-300 hover:bg-white/10 transition-colors group relative"
          title="Open Kiosk Display in new tab"
        >
          <Tv className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="truncate">Open Kiosk Display ↗</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-neutral-900 text-amber-300 text-xs rounded shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              Open Kiosk Display ↗

            </div>
          )}
        </Link>

        { /* Merged User Identity Block */ }
        {!isCollapsed ? (
          <div className="p-2.5 rounded-control bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sidebar-active border border-white/20 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-white truncate block">
                  {currentUser?.name || 'Rajesh Sharma'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-control text-xs font-semibold text-red-200 hover:text-white hover:bg-red-600/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center p-2 rounded-control text-blue-200 hover:text-red-300 hover:bg-white/10 transition-colors group relative"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-full ml-3 px-2 py-1 bg-neutral-900 text-white text-xs rounded shadow-elevated opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              Sign Out
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block transition-all duration-300 ease-out z-30 shrink-0 ${
          isCollapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="fixed inset-y-0 left-0 h-full overflow-y-auto transition-all duration-300 ease-out"
          style={{ width: isCollapsed ? '4.5rem' : '16rem' }}
        >
          {sidebarContent}
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
