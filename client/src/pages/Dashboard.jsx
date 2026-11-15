import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

const PRIORITY_COLORS = {
  LOW: '#3b82f6', // blue
  MEDIUM: '#10b981', // green
  HIGH: '#f59e0b', // amber
  CRITICAL: '#ef4444', // red
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-400">Loading operations analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        {error || 'Unable to load dashboard.'}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (user?.role === 'ADMIN') {
    const { kpis, priorityDistribution, monthlyTrend, topAssetsByCost, technicianWorkload } = data;

    return (
      <div className="space-y-6">
        {/* Title Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>📊</span> Facilities Operations Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Executive campus maintenance health, work order turnaround, assets cost drivers, and resource allocation
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live &amp; Operational
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Campus Assets" value={kpis.totalAssets} icon="🏗️" color="text-slate-800" />
          <StatCard label="Open WOs" value={kpis.openWorkOrders} icon="🔧" color="text-blue-600" />
          <StatCard label="Overdue WOs" value={kpis.overdueWorkOrders} icon="⚠️" color="text-rose-600" alert={kpis.overdueWorkOrders > 0} />
          <StatCard label="PM Compliance" value={`${kpis.pmComplianceRate}%`} icon="📅" color="text-emerald-600" />
          <StatCard label="Low Stock Parts" value={kpis.lowStockPartsCount} icon="📦" color="text-amber-600" alert={kpis.lowStockPartsCount > 0} />
          <StatCard label="Pending Requests" value={kpis.pendingRequests} icon="📋" color="text-indigo-600" />
        </div>

        {/* Charts Row 1: Priority Distribution & Monthly Ticket Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Priority Donut Chart */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Work Orders by Priority</h3>
            <p className="text-xs text-slate-400 mb-4">Risk level classification of maintenance tickets</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {priorityDistribution.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend Bar Chart */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-1">6-Month Maintenance Activity Trend</h3>
            <p className="text-xs text-slate-400 mb-4">Work orders created vs. resolved to completion</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" height={28} />
                  <Bar dataKey="created" name="Tickets Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Tickets Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Top Cost Drivers & Technician Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top 10 Cost Assets */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Top Maintenance Cost Driver Assets</h3>
                <p className="text-xs text-slate-400">Cumulative labor hours and replacement spare parts spend</p>
              </div>
              <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View Cost Report →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-center">WOs</th>
                    <th className="py-2.5 px-3 text-right">Total Maintenance Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topAssetsByCost.slice(0, 6).map((a) => (
                    <tr key={a.assetId} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{a.name}</span>
                        <span className="block font-mono text-[10px] text-blue-600">{a.assetCode}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{a.location}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{a.workOrderCount}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{Number(a.totalCost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technician Workload */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Technician Resource Allocation</h3>
            <p className="text-xs text-slate-400 mb-4">Active vs completed work order assignments</p>
            <div className="space-y-3.5">
              {technicianWorkload.map((t) => (
                <div key={t.technicianId} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800 mb-1.5">
                    <span>{t.name}</span>
                    <span className="text-blue-600">{t.activeWorkOrders} Active Tasks</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-600 h-full"
                      style={{ width: `${Math.min(100, (t.activeWorkOrders / (t.totalAssigned || 1)) * 100)}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${Math.min(100, (t.completedWorkOrders / (t.totalAssigned || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Total assigned: {t.totalAssigned}</span>
                    <span className="text-emerald-600 font-medium">Completed: {t.completedWorkOrders}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TECHNICIAN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (user?.role === 'TECHNICIAN') {
    const { kpis, urgentWorkOrders, recentAssigned } = data;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
          <p className="text-xs text-slate-500 mt-1">Here is your active workload and assigned priority tickets.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="My Active Tasks" value={kpis.activeAssigned} icon="🔧" color="text-blue-600" />
          <StatCard label="High / Critical" value={kpis.highPriorityCount} icon="⚡" color="text-rose-600" alert={kpis.highPriorityCount > 0} />
          <StatCard label="Overdue Tasks" value={kpis.overdueCount} icon="⚠️" color="text-amber-600" alert={kpis.overdueCount > 0} />
          <StatCard label="Total Hours Logged" value={`${kpis.totalLaborHours} hrs`} icon="⏱️" color="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent tickets */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-rose-600">⚡</span> Urgent High-Priority Tickets
            </h3>
            {urgentWorkOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No critical tasks pending.</p>
            ) : (
              <div className="space-y-2">
                {urgentWorkOrders.map((wo) => (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    className="block p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">{wo.title}</span>
                      <span className="text-[10px] font-bold text-rose-700 uppercase px-2 py-0.5 rounded bg-rose-100">
                        {wo.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                      <span>{wo.asset?.name} ({wo.asset?.location?.name})</span>
                      <span>Due: {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent tasks */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-900">Current Task Queue</h3>
              <Link to="/work-orders" className="text-xs font-semibold text-blue-600">View All →</Link>
            </div>
            <div className="space-y-2">
              {recentAssigned.map((wo) => (
                <Link
                  key={wo.id}
                  to={`/work-orders/${wo.id}`}
                  className="block p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">{wo.title}</span>
                    <span className="text-[10px] font-semibold text-slate-600 uppercase px-2 py-0.5 rounded bg-slate-200">
                      {wo.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {wo.asset?.assetCode} • {wo.asset?.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REQUESTER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  const { kpis, recentRequests } = data;
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
          <p className="text-xs text-slate-500 mt-1">Track your campus maintenance requests and equipment issues.</p>
        </div>
        <Link
          to="/requests"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow"
        >
          + Raise New Request
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={kpis.totalRaised} icon="📋" color="text-slate-800" />
        <StatCard label="Pending Approval" value={kpis.pendingReview} icon="⏳" color="text-amber-600" />
        <StatCard label="Approved / In Progress" value={kpis.approvedAndActive} icon="🔧" color="text-blue-600" />
        <StatCard label="Rejected" value={kpis.rejectedCount} icon="✕" color="text-slate-400" />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">My Recent Maintenance Requests</h3>
        {recentRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic">You have not submitted any maintenance requests yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRequests.map((r) => (
              <div key={r.id} className="py-3 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{r.title}</h4>
                  <p className="text-[11px] text-slate-500">{r.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Submitted: {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    r.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, alert }) {
  return (
    <div
      className={`p-4 bg-white rounded-2xl border transition shadow-sm ${
        alert ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
