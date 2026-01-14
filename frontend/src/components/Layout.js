import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ActionModals from './ActionModals';
import { Toaster } from './ui/sonner';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      {/* Main content area - responsive margin */}
      <div className="lg:ml-64 min-h-screen transition-all duration-300 flex flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <ActionModals />
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
