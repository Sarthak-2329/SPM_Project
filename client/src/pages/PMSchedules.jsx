import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function PMSchedules() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Run Now state
  const [runningNow, setRunningNow] = useState(false);
  const [runResult, setRunResult] = useState(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assetId: '',
    frequencyDays: 14,
    nextDueDate: new Date().toISOString().split('T')[0],
  });
  const [checklistItems, setChecklistItems] = useState([
    'Inspect power connections and safety interlocks',
    'Clean filters and dust accumulation',
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/pm-schedules');
      setSchedules(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load PM schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets?limit=100');
      setAssets(res.data?.items || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchSchedules();
    if (isAdmin) {
      fetchAssets();
    }
  }, [isAdmin]);

  const handleRunNow = async () => {
    if (!isAdmin) return;
    setRunningNow(true);
    setRunResult(null);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/pm-schedules/run-now');
      setRunResult(res.data);
      setSuccessMsg('PM Scheduler executed successfully!');
      fetchSchedules();
    } catch (err) {
      setError(err.message || 'Failed to execute PM scheduler');
    } finally {
      setRunningNow(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await api.patch(`/pm-schedules/${id}/toggle`, { isActive: !currentActive });
      fetchSchedules();
    } catch (err) {
      alert(err.message || 'Failed to toggle schedule state');
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems([...checklistItems, newChecklistText.trim()]);
    setNewChecklistText('');
  };

  const removeChecklistItem = (idx) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.assetId || !formData.frequencyDays) {
      alert('Please fill all required fields');
      return;
    }
    setCreating(true);
    try {
      await api.post('/pm-schedules', {
        ...formData,
        frequencyDays: parseInt(formData.frequencyDays, 10),
        checklistItems,
      });
      setShowCreateModal(false);
      setSuccessMsg('PM schedule created successfully!');
      fetchSchedules();
    } catch (err) {
      alert(err.message || 'Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📅</span> Preventive Maintenance (PM) Schedules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring maintenance cycles and routine equipment service checklists (FR-08)
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunNow}
              disabled={runningNow}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow transition disabled:opacity-50"
              title="Immediately scans due schedules and generates work orders idempotently"
            >
              <span>⚡</span>
              {runningNow ? 'Running Scheduler...' : 'Run Scheduler Now'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition"
            >
              <span>+</span> New Schedule
            </button>
          </div>
        )}
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex justify-between items-center">
          <div>
            <p className="font-semibold">{successMsg}</p>
            {runResult && (
              <p className="text-xs text-emerald-700 mt-1">
                Scanned: {runResult.scannedSchedules} schedule(s) | Generated: {runResult.generatedCount} work order(s).
                {runResult.generatedCount === 0 && ' (All due schedules were already generated today - Idempotency confirmed!)'}
              </p>
            )}
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading PM schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No preventive maintenance schedules configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Schedule Name & Asset</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Next Due Date</th>
                  <th className="py-3.5 px-4">Checklist Tasks</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {schedules.map((s) => {
                  const isDue = s.nextDueDate && new Date(s.nextDueDate) <= new Date();
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-blue-600 font-medium">
                            {s.asset?.assetCode}
                          </span>
                          <span>•</span>
                          <span>{s.asset?.name}</span>
                          <span>•</span>
                          <span className="text-slate-400">{s.asset?.location?.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        Every {s.frequencyDays} {s.frequencyDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={isDue ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                            {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : 'Unscheduled'}
                          </span>
                          {isDue && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 animate-pulse">
                              Due Now
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {s.checklistItems?.length || 0} inspection items
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                            s.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleActive(s.id, s.isActive)}
                            className={`px-3 py-1 rounded text-xs font-medium border transition ${
                              s.isActive
                                ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {s.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Create PM Schedule</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Central Chiller Inspection & Service"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Target Asset *
                </label>
                <select
                  required
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Asset --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] {a.name} ({a.location?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Recurrence (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.frequencyDays}
                    onChange={(e) => setFormData({ ...formData, frequencyDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    First Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Description / Scope of Work
                </label>
                <textarea
                  rows="2"
                  placeholder="Detailed instructions for the attending technician..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Dynamic Checklist Builder */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Inspection Checklist Items
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Check oil level and motor bearings..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
                  >
                    + Add Task
                  </button>
                </div>

                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {checklistItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                    >
                      <span>
                        <strong className="mr-2 text-slate-400">{idx + 1}.</strong> {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Create PM Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
