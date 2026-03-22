import React, { useEffect } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import Topbar from './Topbar';
import { LayoutDashboard, Package, Share2, ClipboardSignature, BarChart3, Settings, Menu, LogOut, ChevronLeft } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { canCreateEco } from '../../utils/roleGuard';

const NAVIGATION = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS'] },
  { name: 'Products', path: '/products', icon: Package, roles: ['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS'] },
  { name: 'Bills of Materials', path: '/bom', icon: Share2, roles: ['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS'] },
  { name: 'Change Orders', path: '/eco', icon: ClipboardSignature, roles: ['ADMIN', 'ENGINEER', 'APPROVER'] },
  { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'ENGINEER', 'APPROVER'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
];

function AppShell() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const userRole = user?.role;
  const userName = user?.name || 'User';
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      if (e.key === 'n' || e.key === 'N') {
        if (user && canCreateEco(user)) {
          navigate('/eco/new');
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'Escape') {
        const evt = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 });
        document.dispatchEvent(evt);
        const closeBtn = document.querySelector('button[aria-label="Close"], button > svg.lucide-x');
        if (closeBtn) closeBtn.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      logout();
    }
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-b-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-20 shadow-xl`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!sidebarCollapsed && <span className="text-xl font-bold tracking-tight text-white">PLM Nexus</span>}
          {sidebarCollapsed && <span className="text-xl font-bold text-white mx-auto">P</span>}
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAVIGATION.map((item) => {
            if (!item.roles.includes(userRole)) return null;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
                title={sidebarCollapsed ? item.name : ''}
              >
                <item.icon
                  className={`flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`}
                  size={20}
                />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3 truncate">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400 capitalize">{userRole}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 p-2 rounded transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <div className="mt-4 flex justify-center">
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-slate-50 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
