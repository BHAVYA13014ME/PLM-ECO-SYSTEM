import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import BomPage from './pages/BomPage';
import ECOPage from './pages/ECOPage';
import NewECOPage from './pages/NewECOPage';
import ECODetailPage from './pages/ECODetailPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/authApi';

// Temporary Blank Pages for routing
const NotFound = () => <div className="p-6 text-red-500">404 Not Found</div>;

function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      if (e.key === 'n') {
        if (['ADMIN', 'ENGINEER'].includes(user?.role)) {
          navigate('/eco'); // Open ECO page to click New (or directly to new if route existed)
        }
      }
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        // Handled intrinsically by modal states via modal specific logic or simple blur
        document.activeElement?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);

  return null;
}


function App() {
  const { isAuthenticated, setCredentials, logout } = useAuthStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const bootstrapStartedRef = useRef(false);

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;

    // Do not attempt refresh on login route when no session exists yet.
    if (window.location.pathname === '/login') {
      setIsBootstrapping(false);
      return;
    }

    if (isAuthenticated) {
      setIsBootstrapping(false);
      return;
    }

    const bootstrapSession = async () => {
      try {
        const response = await authApi.refreshSession();
        const { user, accessToken } = response.data.data;
        setCredentials(user, accessToken);
      } catch {
        logout();
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();
  }, [isAuthenticated, logout, setCredentials]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-b-transparent animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <KeyboardShortcuts />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS']} />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/bom" element={<BomPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ENGINEER', 'APPROVER']} />}>
              <Route path="/eco" element={<ECOPage />} />
              <Route path="/eco/new" element={<NewECOPage />} />
              <Route path="/eco/:id" element={<ECODetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
