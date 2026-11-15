import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function WorkOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [workOrders, setWorkOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create WO modal (Admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [newWO, setNewWO] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assetId: '',
    assigneeId: '',
    dueDate: '',
    estimatedCost: '',
  });

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (isOverdue) params.isOverdue = true;
      if (search) params.search = search;

      const res = await api.get('/work-orders', { params });
      setWorkOrders(res.data.items);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAux = async () => {
    if (isAdmin) {
      try {
        const [aRes, uRes] = await Promise.all([
          api.get('/assets?limit=100'),
          api.get('/users?role=TECHNICIAN'),
        ]);
        setAssets(aRes.data.items);
        setTechnicians(uRes.data.items);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchAux();
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [page, status, priority, isOverdue]);

  const handleCreateWO = async (e) => {
    e.preventDefault();
    try {
      await api.post('/work-orders', {
        ...newWO,
        assetId: newWO.assetId || undefined,
        assigneeId: newWO.assigneeId || undefined,
        dueDate: newWO.dueDate || undefined,
        estimatedCost: newWO.estimatedCost ? parseFloat(newWO.estimatedCost) : undefined,
      });
      setShowCreateModal(false);
      setNewWO({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assetId: '',
        assigneeId: '',
        dueDate: '',
        estimatedCost: '',
      });
      fetchWorkOrders();
    } catch (err) {
      alert(err.message || 'Creation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Campus Maintenance Work Orders' : 'My Assigned Work Orders'}
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? `Tracking ${meta.total} work orders across campus infrastructure.`
              : 'Maintenance tasks assigned to you. Update status, log hours and parts used.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>➕</span> Create Manual Work Order
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search title, asset, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchWorkOrders()}
            className="w-full text-sm border-none focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer">
          <input
            type="checkbox"
            checked={isOverdue}
            onChange={(e) => {
              setIsOverdue(e.target.checked);
              setPage(1);
            }}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span>🚨 Overdue Only</span>
        </label>
      </div>

      {/* Work Orders Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
          Loading work orders...
        </div>
      ) : workOrders.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
          No work orders match the current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                    WO #{wo.id.slice(-6)}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {wo.isOverdue && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-black rounded bg-rose-600 text-white animate-pulse">
                        OVERDUE
                      </span>
                    )}

                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        wo.priority === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : wo.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {wo.priority}
                    </span>

                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        wo.status === 'CLOSED'
                          ? 'bg-gray-200 text-gray-700'
                          : wo.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : wo.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : wo.status === 'ON_HOLD'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {wo.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2">
                  {wo.title}
                </h3>

                {wo.asset ? (
                  <p className="text-xs text-blue-600 font-medium mb-2 truncate">
                    ⚙️ [{wo.asset.assetCode}] {wo.asset.name}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mb-2">General facility issue</p>
                )}

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>
                    <span className="text-gray-400">Technician:</span>{' '}
                    <strong className="text-gray-700">{wo.assignee?.name || 'Unassigned'}</strong>
                  </p>
                  <p>
                    <span className="text-gray-400">Target Due:</span>{' '}
                    {wo.dueDate ? (
                      <span className={wo.isOverdue ? 'text-rose-600 font-bold' : ''}>
                        {new Date(wo.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      'None'
                    )}
                  </p>
                  {wo.timeSpent && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ⏱️ {wo.timeSpent} hours logged
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <Link
                  to={`/work-orders/${wo.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Manage Lifecycle &rarr;
                </Link>

                <div className="text-[11px] text-gray-400">
                  {wo._count?.notes || 0} notes
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 text-sm">
          <p className="text-gray-600 text-xs">
            Showing Page <span className="font-semibold">{meta.page}</span> of{' '}
            <span className="font-semibold">{meta.totalPages}</span> ({meta.total} work orders)
          </p>
          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              &larr; Previous
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Manual Work Order (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Create Maintenance Work Order</h3>
            <form onSubmit={handleCreateWO} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Work Order Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Diesel Generator Overhaul"
                  value={newWO.title}
                  onChange={(e) => setNewWO({ ...newWO, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Detailed Scope &amp; Instructions *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Steps, safety precautions, parts required..."
                  value={newWO.description}
                  onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Target Asset</label>
                  <select
                    value={newWO.assetId}
                    onChange={(e) => setNewWO({ ...newWO, assetId: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">No specific asset</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.assetCode}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Assign Technician</label>
                  <select
                    value={newWO.assigneeId}
                    onChange={(e) => setNewWO({ ...newWO, assigneeId: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Leave Unassigned (OPEN)</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Priority</label>
                  <select
                    value={newWO.priority}
                    onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Target Due Date</label>
                  <input
                    type="date"
                    value={newWO.dueDate}
                    onChange={(e) => setNewWO({ ...newWO, dueDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Est. Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="2500"
                    value={newWO.estimatedCost}
                    onChange={(e) => setNewWO({ ...newWO, estimatedCost: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
