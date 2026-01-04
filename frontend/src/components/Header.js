import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Users, UserPlus, DollarSign } from 'lucide-react';

const Header = () => {
  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: UserPlus, label: 'Leads', path: '/leads' },
    { icon: DollarSign, label: 'Payments', path: '/payments' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30">
      <nav className="flex items-center gap-6">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-[#2E7DA1]/10 text-[#2E7DA1]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
};

export default Header;
