import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Topbar } from '@/components/layout/Topbar';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('easybill-sidebar') === 'collapsed'; } catch { return false; }
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('easybill-sidebar', next ? 'collapsed' : 'expanded'); } catch {}
      return next;
    });
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - fixed en md+ */}
      <Sidebar className="hidden md:flex" collapsed={collapsed} onToggle={toggleSidebar} />

      {/* Main content — offset por sidebar fixed */}
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[248px]'}`}>
        {/* Topbar mobile - ambos roles */}
        <Topbar />

        <main className="flex-1 overflow-x-hidden p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav - mobile para ambos roles */}
      <BottomNav className="md:hidden" />
    </div>
  );
};

export { AppLayout };
