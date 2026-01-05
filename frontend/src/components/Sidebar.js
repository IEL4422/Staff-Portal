import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);

  // Check if current user is admin (case-insensitive)
  const isAdmin = user?.email?.toLowerCase() === 'contact@illinoisestatelaw.com';

  // Main nav items - Payments only for admin
  const mainNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    ...(isAdmin ? [{ icon: DollarSign, label: 'Payments', path: '/payments' }] : []),
  ];

  const actionItems = [
    { icon: Phone, label: 'Phone Call Intake', path: '/actions/phone-intake' },
    { icon: Send, label: 'Send Case Update', path: '/actions/case-update' },
    { icon: Mail, label: 'Send Mail', path: '/actions/send-mail' },
    { icon: FileText, label: 'Send Invoice', path: '/actions/send-invoice' },
    { icon: CheckSquare, label: 'Add Task', path: '/actions/add-task' },
    { icon: Calendar, label: 'Add Date/Deadline', path: '/actions/add-deadline' },
    { icon: Upload, label: 'Upload File', path: '/actions/upload-file' },
    { icon: UserPlus, label: 'Add Case Contact', path: '/actions/add-contact' },
    { icon: Users, label: 'Add Lead', path: '/actions/add-lead' },
    { icon: Users, label: 'Add Client', path: '/actions/add-client' },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-slate-900 text-slate-300 transition-all duration-300 z-40 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src="https://i.imgur.com/pKy65wF.png" alt="Illinois Estate Law" className="w-10 h-10 rounded-lg object-contain bg-white" />
            <div>
              <h1 className="font-semibold text-white text-sm">Illinois Estate Law</h1>
              <p className="text-xs text-slate-400">Staff Portal</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
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
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800">
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
          <button
            onClick={logout}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
