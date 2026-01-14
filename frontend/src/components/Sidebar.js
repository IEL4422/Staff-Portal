import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useActionModals } from '../context/ActionModalsContext';
import {
  Home,
  Phone,
  Send,
  Mail,
  FileText,
  CheckSquare,
  Calendar,
  Upload,
  UserPlus,
  Users,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Wallet,
  Settings,
  Star,
  FilePlus2
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { openModal } = useActionModals();
  const [collapsed, setCollapsed] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    // Use a small timeout to avoid cascading renders
    const timer = setTimeout(() => {
      if (mobileOpen) {
        setMobileOpen(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname, mobileOpen]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if current user is admin (case-insensitive)
  const isAdmin = user?.email?.toLowerCase() === 'contact@illinoisestatelaw.com';

  // Main nav items - Payments and Reviews only for admin
  const mainNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    ...(isAdmin ? [{ icon: DollarSign, label: 'Payments', path: '/payments' }] : []),
    ...(isAdmin ? [{ icon: Star, label: 'Reviews', path: '/reviews' }] : []),
  ];

  // Action items - most open as modals, Generate Documents navigates
  const actionItems = [
    { icon: Wallet, label: 'Add Asset/Debt', modalName: 'addAssetDebt' },
    { icon: UserPlus, label: 'Add Case Contact', modalName: 'addContact' },
    { icon: Users, label: 'Add Client', modalName: 'addClient' },
    { icon: Calendar, label: 'Add Date/Deadline', modalName: 'addDeadline' },
    { icon: Users, label: 'Add Lead', modalName: 'addLead' },
    { icon: CheckSquare, label: 'Add Task', modalName: 'addTask' },
    { icon: FilePlus2, label: 'Generate Documents', path: '/actions/generate-documents' }, // Keep as page navigation
    { icon: Phone, label: 'Phone Call Intake', modalName: 'phoneIntake' },
    { icon: Send, label: 'Send Case Update', modalName: 'caseUpdate' },
    { icon: FileText, label: 'Send Invoice', modalName: 'sendInvoice' },
    { icon: Mail, label: 'Send Mail', modalName: 'sendMail' },
    { icon: Upload, label: 'Upload File', modalName: 'uploadFile' },
  ];

  const handleActionClick = (item) => {
    if (item.modalName) {
      openModal(item.modalName);
    }
    // If item has a path, NavLink will handle navigation
  };

  return (
    <>
      {/* Mobile Menu Toggle Button - Fixed at top left */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e3a5f] text-white rounded-lg shadow-lg hover:bg-[#2a4a6f] transition-colors"
        data-testid="mobile-menu-toggle"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          data-testid="mobile-overlay"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-gradient-to-b from-[#1e3a5f] to-[#0d1f33] text-slate-300 transition-all duration-300 z-40 flex flex-col",
          // Desktop: normal collapsed behavior
          "lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-64",
          // Mobile: slide in/out, always full width when open
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img src="https://i.imgur.com/pKy65wF.png" alt="Illinois Estate Law" className="w-10 h-10 rounded-lg object-contain bg-white" />
              <div>
                <h1 className="font-semibold text-white text-sm">Illinois Estate Law</h1>
                <p className="text-xs text-slate-400">Staff Portal</p>
              </div>
            </div>
          )}
          {/* Desktop collapse toggle - hidden on mobile */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="sidebar-toggle"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="mobile-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "sidebar-link",
                isActive && "active"
              )
            }
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Actions Section */}
        <div className="pt-4">
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white transition-colors",
              collapsed && "justify-center"
            )}
            data-testid="actions-toggle"
          >
            {!collapsed ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider">Actions</span>
                {actionsOpen ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
              </>
            ) : (
              <div className="w-8 border-t border-slate-700" />
            )}
          </button>

          {(actionsOpen || collapsed) && (
            <div className="mt-2 space-y-1">
              {actionItems.map((item) => (
                item.path ? (
                  // Items with path use NavLink for navigation
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "sidebar-link text-sm",
                        isActive && "active"
                      )
                    }
                    data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ) : (
                  // Items with modalName use button to open modal
                  <button
                    key={item.modalName}
                    onClick={() => handleActionClick(item)}
                    className={cn(
                      "sidebar-link text-sm w-full text-left"
                    )}
                    data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700/50">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 bg-[#2E7DA1] rounded-full flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
          <NavLink
            to="/settings"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </NavLink>
          <button
            onClick={logout}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Logout"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
