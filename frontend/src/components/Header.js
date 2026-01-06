import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Users, UserPlus, ExternalLink, Link2, Gavel, ClipboardList, Calendar, ChevronDown, Wallet, UserCheck, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';

const Header = () => {
  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: UserPlus, label: 'Leads', path: '/leads' },
    { icon: ClipboardList, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
  ];

  const moreItems = [
    { icon: Gavel, label: 'Judge Info', path: '/judge-information' },
    { icon: Wallet, label: 'Assets & Debts', path: '/assets-debts' },
    { icon: UserCheck, label: 'Case Contacts', path: '/case-contacts' },
  ];

  const quickLinks = [
    { label: 'Cook County Portal', url: 'https://cccportal.cookcountyclerkofcourt.org/CCCPortal/', category: 'portals' },
    { label: 'DuPage County Portal', url: 'https://eaccess.dupagecircuitclerk.gov/CRIS/PreLogin.do', category: 'portals' },
    { label: 'Will County Portal', url: 'https://iattorney.il12th.org/SearchPrompt.php?WS=W68dd5d0919f99', category: 'portals' },
    { label: 'Kane County Portal', url: 'https://kanecoportal.co.kane.il.us/portal', category: 'portals' },
    { label: 'Lake County Portal', url: 'https://prod-portal-ecourt-lakecounty-il.journaltech.com/public-portal/?q=Home', category: 'portals' },
    { label: 'separator1', category: 'separator' },
    { label: 'Cook County Deed Search', url: 'https://crs.cookcountyclerkil.gov/Search', category: 'search' },
    { label: 'Deed Search', url: 'https://dnastore.firstam.com/?utm_source=datatree-property-research&utm_medium=store-button-featured&utm_campaign=datatree-page-traffic&_gl=1*1xyrooh*_gcl_aw*R0NMLjE3NjU0NzI5OTguQ2owS0NRaUE5T25KQmhELUFSSXNBUFY1MXhPMm91MW5ZeVE0al9mOUp0alJzT3ZiVkR2WTNWQ3lKZG5fX2FQMHk1VWRNa0t6eFFqSm1wc2FBdVpfRUFMd193Y0I.*_gcl_au*MTk4Mzc3MTc2MS4xNzY1NDcyOTk1', category: 'search' },
    { label: 'Unclaimed Property Search', url: 'https://icash.illinoistreasurer.gov/app/claim-search', category: 'search' },
    { label: 'separator2', category: 'separator' },
    { label: 'EIN Number', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number', category: 'other' },
    { label: 'Cook County Creditor Notice', url: 'https://www.publicnoticenetwork.net/lbpcLogin/home', category: 'other' },
    { label: 'Certified Copy Request (DuPage, Will, Kendall)', url: 'https://efileil.i2file.net/', category: 'other' },
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
        
        {/* Quick Links Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 outline-none">
            <Link2 className="w-4 h-4" />
            <span>Quick Links</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-xs text-slate-500 font-normal">County Portals</DropdownMenuLabel>
            {quickLinks.map((link, index) => {
              if (link.category === 'separator') {
                return <DropdownMenuSeparator key={link.label} />;
              }
              if (link.category === 'portals') {
                return (
                  <DropdownMenuItem key={index} asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </DropdownMenuItem>
                );
              }
              return null;
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Search Tools</DropdownMenuLabel>
            {quickLinks.map((link, index) => {
              if (link.category === 'search') {
                return (
                  <DropdownMenuItem key={index} asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </DropdownMenuItem>
                );
              }
              return null;
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Other Resources</DropdownMenuLabel>
            {quickLinks.map((link, index) => {
              if (link.category === 'other') {
                return (
                  <DropdownMenuItem key={index} asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </DropdownMenuItem>
                );
              }
              return null;
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 outline-none">
            <MoreHorizontal className="w-4 h-4" />
            <span>More</span>
            <ChevronDown className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.path} asChild>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 cursor-pointer w-full",
                      isActive && "text-[#2E7DA1] font-medium"
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
};

export default Header;
