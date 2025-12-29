import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from './ui/sonner';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
