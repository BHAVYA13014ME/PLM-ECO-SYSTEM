import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reportApi } from '../../api/reportApi';

function Topbar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/products')) return 'Products';
    if (path.startsWith('/bom')) return 'Bills of Materials';
    if (path.startsWith('/eco')) return 'Change Orders';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/settings')) return 'Settings';
    return '';
  };

  const { data: summaryData } = useQuery({
    queryKey: ['eco-summary'],
    queryFn: () => reportApi.getEcoSummary(),
    enabled: ['APPROVER', 'ADMIN'].includes(user?.role),
    refetchInterval: 30000,
  });

  const pendingCount = (summaryData?.data?.byStatus?.IN_PROGRESS || 0) + (summaryData?.data?.byStatus?.NEW || 0);
  const recentPending = summaryData?.data?.recentECOs?.filter((e) => ['NEW', 'IN_PROGRESS'].includes(e.status)) || [];

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center space-x-4 relative">
        {['APPROVER', 'ADMIN'].includes(user?.role) && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors rounded-full hover:bg-slate-100"
            >
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 py-1 z-50 animate-fade-in-down">
                <div className="px-4 py-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Pending Approvals</h3>
                </div>
                {recentPending.length > 0 ? (
                  <ul className="max-h-60 overflow-y-auto">
                    {recentPending.map((eco) => (
                      <li key={eco._id}>
                        <Link
                          to={`/eco/${eco._id}`}
                          onClick={() => setShowNotifications(false)}
                          className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-900 truncate">{eco.title}</p>
                          <p className="text-xs text-slate-500 mt-1">Status: {eco.status}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    No pending approvals.
                  </div>
                )}
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <Link
                    to="/eco"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View all Change Orders
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
