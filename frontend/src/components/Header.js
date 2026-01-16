import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Users, UserPlus, ExternalLink, Link2, Gavel, ClipboardList, Calendar, ChevronDown, Wallet, UserCheck, MoreHorizontal, Search, X, Loader2, ArrowRight, Shield, Mail, Phone } from 'lucide-react';
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
  const [searchFilter, setSearchFilter] = useState('all'); // Quick filter state
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Filter types for quick filtering
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'probate', label: 'Probate' },
    { value: 'estate', label: 'Estate' },
    { value: 'lead', label: 'Lead' },
  ];

  // Filter search results based on selected filter
  const filteredResults = searchResults.filter((record) => {
    if (searchFilter === 'all') return true;
    const caseType = (record.fields?.['Type of Case'] || '').toLowerCase();
    if (searchFilter === 'probate') return caseType.includes('probate');
    if (searchFilter === 'estate') return caseType.includes('estate planning');
    if (searchFilter === 'lead') return caseType === 'lead';
    return true;
  });

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
        setSearchFilter('all'); // Reset filter when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchFilter('all'); // Reset filter when query is cleared
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
    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-30">
      <nav className="flex items-center justify-between">
        {/* Mobile: Icon-only navigation, Desktop: Full navigation */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-6 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors relative whitespace-nowrap",
                  isActive
                    ? "bg-[#2E7DA1]/10 text-[#2E7DA1]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
              {/* Show badge next to Tasks */}
              {item.label === 'Tasks' && notStartedTaskCount > 0 && (
                <span className="min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 px-1 sm:px-1.5 flex items-center justify-center text-[10px] sm:text-xs font-semibold bg-red-500 text-white rounded-full">
                  {notStartedTaskCount > 99 ? '99+' : notStartedTaskCount}
                </span>
              )}
            </NavLink>
          ))}
          
          {/* Quick Links Dropdown - Hidden on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 outline-none">
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
            <DropdownMenuTrigger className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 outline-none">
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
              <ChevronDown className="w-3 h-3 hidden sm:block" />
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
            <div className="fixed sm:relative inset-0 sm:inset-auto bg-white sm:bg-transparent z-50 sm:z-auto p-3 sm:p-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search clients, cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 w-full sm:w-80 h-11 sm:h-9 text-base sm:text-sm rounded-xl sm:rounded-lg"
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
                  <X className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Search Results Dropdown - Full screen on mobile */}
              {(searching || searchResults.length > 0 || (searchQuery.length >= 2 && !searching)) && (
                <div className="absolute sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-[420px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-[calc(100vh-120px)] sm:max-h-none">
                  {searching && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
                    </div>
                  )}
                  
                  {!searching && searchResults.length > 0 && (
                    <>
                      {/* Quick Filters - Scrollable on mobile */}
                      <div className="bg-slate-50 px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-hide" data-testid="header-quick-filters">
                        {filterOptions.map((option) => {
                          const count = option.value === 'all' 
                            ? searchResults.length 
                            : searchResults.filter(r => {
                                const ct = (r.fields?.['Type of Case'] || '').toLowerCase();
                                if (option.value === 'probate') return ct.includes('probate');
                                if (option.value === 'estate') return ct.includes('estate planning');
                                if (option.value === 'lead') return ct === 'lead';
                                return false;
                              }).length;
                          
                          if (option.value !== 'all' && count === 0) return null;
                          
                          return (
                            <button
                              key={option.value}
                              onClick={() => setSearchFilter(option.value)}
                              data-testid={`header-filter-${option.value}`}
                              className={`px-2 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                                searchFilter === option.value
                                  ? 'bg-[#2E7DA1] text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {option.label} ({count})
                            </button>
                          );
                        })}
                      </div>
                      <div className="max-h-72 sm:max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {filteredResults.slice(0, 8).map((record) => {
                          const fields = record.fields || {};
                          const caseType = (fields['Type of Case'] || '').toLowerCase();
                          const isProbate = caseType.includes('probate');
                          
                          return (
                            <button
                              key={record.id}
                              onClick={() => navigateToCase(record)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
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
                                        <span className="flex items-center gap-1 truncate text-xs sm:text-sm">
                                          <Mail className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{fields['Email Address']}</span>
                                        </span>
                                      )}
                                      {fields['Phone Number'] && (
                                        <span className="flex items-center gap-1 text-xs sm:text-sm">
                                          <Phone className="w-3 h-3 flex-shrink-0" />
                                          {fields['Phone Number']}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge className={cn("flex-shrink-0 text-xs", getCaseTypeColor(fields['Type of Case']))}>
                                  {fields['Type of Case'] || 'Unknown'}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                        {filteredResults.length === 0 && searchResults.length > 0 && (
                          <div className="px-4 py-4 text-center text-slate-500 text-sm">
                            No {filterOptions.find(o => o.value === searchFilter)?.label} results.
                            <button 
                              onClick={() => setSearchFilter('all')} 
                              className="ml-1 text-[#2E7DA1] hover:underline"
                            >
                              Show all
                            </button>
                          </div>
                        )}
                      </div>
                      {filteredResults.length > 8 && (
                        <div className="px-4 py-2 text-center text-sm text-slate-500 bg-slate-50">
                          +{filteredResults.length - 8} more results
                        </div>
                      )}
                    </>
                  )}

                  {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="py-6 text-center text-slate-500">
                      No results found for &quot;{searchQuery}&quot;
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
