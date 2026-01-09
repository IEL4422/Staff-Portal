import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Users, UserPlus, ExternalLink, Link2, Gavel, ClipboardList, Calendar, ChevronDown, Wallet, UserCheck, MoreHorizontal, Search, X, Loader2, ArrowRight, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { masterListApi, tasksApi, authApi } from '../services/api';

const Header = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notStartedTaskCount, setNotStartedTaskCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await authApi.checkAdmin();
        setIsAdmin(response.data.is_admin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
    };
    checkAdmin();
  }, []);

  // Fetch not started tasks count
  useEffect(() => {
    const fetchTaskCount = async () => {
      try {
        const response = await tasksApi.getMyTasks();
        const tasks = response.data.tasks || [];
        const notStarted = tasks.filter(t => 
          (t.fields?.Status || '').toLowerCase() === 'not started'
        ).length;
        setNotStartedTaskCount(notStarted);
      } catch (error) {
        console.error('Failed to fetch task count:', error);
      }
    };
    
    fetchTaskCount();
    // Refresh every 5 minutes
    const interval = setInterval(fetchTaskCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    { label: 'Deed Search', url: 'https://dnastore.firstam.com/', category: 'search' },
    { label: 'Unclaimed Property Search', url: 'https://icash.illinoistreasurer.gov/app/claim-search', category: 'search' },
    { label: 'separator2', category: 'separator' },
    { label: 'EIN Number', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number', category: 'other' },
    { label: 'Cook County Creditor Notice', url: 'https://www.publicnoticenetwork.net/lbpcLogin/home', category: 'other' },
    { label: 'Certified Copy Request', url: 'https://efileil.i2file.net/', category: 'other' },
  ];

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await masterListApi.search(searchQuery);
        setSearchResults(response.data.records || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getCaseTypeColor = (caseType) => {
    const type = (caseType || '').toLowerCase();
    if (type.includes('probate')) return 'bg-purple-100 text-purple-700';
    if (type.includes('estate planning')) return 'bg-blue-100 text-blue-700';
    if (type.includes('deed')) return 'bg-green-100 text-green-700';
    if (type === 'lead') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  const navigateToCase = (record) => {
    const caseType = (record.fields?.['Type of Case'] || '').toLowerCase();
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    
    if (caseType.includes('probate')) {
      navigate(`/case/probate/${record.id}`);
    } else if (caseType.includes('estate planning')) {
      navigate(`/case/estate-planning/${record.id}`);
    } else if (caseType.includes('deed')) {
      navigate(`/case/deed/${record.id}`);
    } else if (caseType === 'lead') {
      navigate(`/case/lead/${record.id}`);
    } else {
      navigate(`/case/probate/${record.id}`);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors relative",
                  isActive
                    ? "bg-[#2E7DA1]/10 text-[#2E7DA1]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {/* Show badge next to Tasks */}
              {item.label === 'Tasks' && notStartedTaskCount > 0 && (
                <span className="ml-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-red-500 text-white rounded-full">
                  {notStartedTaskCount > 99 ? '99+' : notStartedTaskCount}
                </span>
              )}
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
              {/* Admin Dashboard - Only visible to admin */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 cursor-pointer w-full",
                          isActive && "text-[#2E7DA1] font-medium"
                        )
                      }
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </NavLink>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side: Search */}
        <div className="flex items-center gap-2">
        {/* Search Button */}
        <div className="relative" ref={searchContainerRef}>
          {!searchOpen ? (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Search Master List"
            >
              <Search className="w-5 h-5" />
            </button>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search clients, cases, emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 w-80 h-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results Dropdown */}
              {(searching || searchResults.length > 0 || (searchQuery.length >= 2 && !searching)) && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {searching && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
                    </div>
                  )}
                  
                  {!searching && searchResults.length > 0 && (
                    <>
                      <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.slice(0, 8).map((record) => {
                          const fields = record.fields || {};
                          const caseType = (fields['Type of Case'] || '').toLowerCase();
                          const isProbate = caseType.includes('probate');
                          
                          return (
                            <button
                              key={record.id}
                              onClick={() => navigateToCase(record)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 truncate">
                                    {fields['Matter Name'] || fields.Client || 'Unnamed'}
                                  </p>
                                  <div className="text-sm text-slate-500 space-y-0.5">
                                    {isProbate && fields['Case Number'] && (
                                      <p className="font-medium text-purple-600">Case #: {fields['Case Number']}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {fields['Email Address'] && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Mail className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{fields['Email Address']}</span>
                                        </span>
                                      )}
                                      {fields['Phone Number'] && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3 flex-shrink-0" />
                                          {fields['Phone Number']}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge className={cn("flex-shrink-0", getCaseTypeColor(fields['Type of Case']))}>
                                  {fields['Type of Case'] || 'Unknown'}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {searchResults.length > 8 && (
                        <div className="px-4 py-2 text-center text-sm text-slate-500 bg-slate-50">
                          +{searchResults.length - 8} more results
                        </div>
                      )}
                    </>
                  )}

                  {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="py-6 text-center text-slate-500">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
