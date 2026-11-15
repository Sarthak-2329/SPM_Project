import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTechnician = user?.role === 'TECHNICIAN';

  const [wo, setWo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Note state
  const [newNote, setNewNote] = useState('');

  // Time logging state
  const [logHours, setLogHours] = useState('');

  // Parts & Inventory state (Phase 4: FR-09)
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [addingPart, setAddingPart] = useState(false);

  // Technician assignment state (Admin)
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchWorkOrder = async () => {
    try {
      const res = await api.get(`/work-orders/${id}`);
      setWo(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartsCatalogue = async () => {
    try {
      const res = await api.get('/parts?limit=100');
      setAvailableParts(res.data?.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTechnicians = async () => {
    if (isAdmin) {
      try {
        const res = await api.get('/users?role=TECHNICIAN');
        setTechnicians(res.data.items);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchWorkOrder();
    fetchTechnicians();
    fetchPartsCatalogue();
  }, [id]);

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!selectedPartId || partQuantity <= 0) return;
    setAddingPart(true);
    try {
      await api.post(`/work-orders/${id}/parts`, {
        partId: selectedPartId,
        quantityUsed: parseInt(partQuantity, 10),
      });
      setSelectedPartId('');
      setPartQuantity(1);
      fetchWorkOrder();
      fetchPartsCatalogue();
    } catch (err) {
      alert(err.message || 'Failed to add part to work order');
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (partId) => {
    if (!confirm('Remove this part from the work order? Stock will be restored to inventory.')) return;
    try {
      await api.delete(`/work-orders/${id}/parts/${partId}`);
      fetchWorkOrder();
      fetchPartsCatalogue();
    } catch (err) {
      alert(err.message || 'Failed to remove part');
    }
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/work-orders/${id}/status`, {
        status: targetStatus,
        reason: statusReason || undefined,
      });
      setShowStatusModal(false);
      setStatusReason('');
      fetchWorkOrder();
    } catch (err) {
      alert(err.message || 'Status transition failed');
    }
  };

  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/work-orders/${id}/assign`, {
        technicianId: selectedTechId,
      });
      setShowAssignModal(false);
      fetchWorkOrder();
    } catch (err) {
      alert(err.message || 'Assignment failed');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await api.post(`/work-orders/${id}/notes`, { content: newNote });
      setNewNote('');
      fetchWorkOrder();
    } catch (err) {
      alert(err.message || 'Failed to post note');
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!logHours || parseFloat(logHours) <= 0) return;
    try {
      await api.patch(`/work-orders/${id}/time`, { hours: parseFloat(logHours) });
      setLogHours('');
      fetchWorkOrder();
    } catch (err) {
      alert(err.message || 'Failed to log hours');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading work order details...</div>;
  }

  if (!wo) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border">
        <h2 className="text-xl font-bold text-gray-800">Work Order Not Found</h2>
        <Link to="/work-orders" className="mt-4 inline-block text-blue-600 font-semibold">
          &larr; Return to Work Orders
        </Link>
      </div>
    );
  }

  // Calculate permissible transitions based on role and current state
  const allowedNextStatuses = [];
  if (isAdmin) {
    if (wo.status === 'OPEN') allowedNextStatuses.push('CLOSED');
    if (wo.status === 'ASSIGNED') allowedNextStatuses.push('IN_PROGRESS', 'ON_HOLD', 'CLOSED');
    if (wo.status === 'IN_PROGRESS') allowedNextStatuses.push('ON_HOLD', 'COMPLETED', 'CLOSED');
    if (wo.status === 'ON_HOLD') allowedNextStatuses.push('IN_PROGRESS', 'CLOSED');
    if (wo.status === 'COMPLETED') allowedNextStatuses.push('CLOSED', 'IN_PROGRESS');
  } else if (isTechnician) {
    if (wo.status === 'ASSIGNED') allowedNextStatuses.push('IN_PROGRESS', 'ON_HOLD');
    if (wo.status === 'IN_PROGRESS') allowedNextStatuses.push('ON_HOLD', 'COMPLETED');
    if (wo.status === 'ON_HOLD') allowedNextStatuses.push('IN_PROGRESS');
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link to="/work-orders" className="text-xs font-semibold text-gray-500 hover:text-gray-800">
            &larr; Back to Work Orders List
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded bg-slate-900 text-white">
              WO #{wo.id.slice(-6)}
            </span>
            <span
              className={`px-3 py-0.5 text-xs font-bold rounded-full ${
                wo.priority === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-700'
                  : wo.priority === 'HIGH'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {wo.priority} Priority
            </span>
            {wo.isOverdue && (
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-600 text-white animate-pulse">
                OVERDUE
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg transition"
            >
              👤 {wo.assignee ? 'Reassign Tech' : 'Assign Technician'}
            </button>
          )}

          {allowedNextStatuses.map((st) => (
            <button
              key={st}
              onClick={() => {
                setTargetStatus(st);
                setShowStatusModal(true);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                st === 'CLOSED'
                  ? 'bg-slate-900 hover:bg-black text-white'
                  : st === 'COMPLETED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : st === 'ON_HOLD'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Move to &rarr; {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Details + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details, Notes, Time */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Work Order Scope
              </span>
              <h1 className="text-xl font-extrabold text-gray-900 mt-1">{wo.title}</h1>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{wo.description}</p>
            </div>

            {wo.asset && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    Target Asset: [{wo.asset.assetCode}] {wo.asset.name}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    📍 {wo.asset.location?.name} ({wo.asset.category?.name})
                  </p>
                </div>
                <Link
                  to={`/assets/${wo.asset.id}`}
                  className="px-2.5 py-1 bg-white border border-blue-200 text-blue-600 hover:text-blue-800 text-xs font-semibold rounded"
                >
                  View Asset &rarr;
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
              <div>
                <span className="text-gray-400">Current Status:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{wo.status.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-gray-400">Assigned Technician:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {wo.assignee ? wo.assignee.name : 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Target Due Date:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Time Spent (Hours):</span>
                <p className="font-bold text-emerald-600 text-sm mt-0.5">
                  {wo.timeSpent ? `${wo.timeSpent} hrs` : '0.0 hrs'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Total Actual Cost:</span>
                <p className="font-extrabold text-blue-600 text-base mt-0.5">
                  ₹{wo.actualCost != null ? Number(wo.actualCost).toFixed(2) : '0.00'}
                </p>
                <p className="text-[10px] text-gray-400">Parts + Labour (₹250/hr)</p>
              </div>
              <div>
                <span className="text-gray-400">Estimated Cost:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {wo.estimatedCost ? `₹${wo.estimatedCost}` : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Originating Request:</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {wo.maintenanceRequestId ? `#${wo.maintenanceRequestId.slice(-6)}` : 'Manual Admin Creation'}
                </p>
              </div>
            </div>
          </div>

          {/* Time Logging Widget (Technician & Admin) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Log Maintenance Labor Hours</h3>
            <form onSubmit={handleLogTime} className="flex gap-3">
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="e.g. 1.5"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                className="w-32 px-3 py-1.5 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                + Add Hours
              </button>
            </form>
          </div>

          {/* Parts & Materials Consumed Section (Phase 4: FR-09) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span>📦</span> Spare Parts &amp; Consumables Used ({wo.parts?.length || 0})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Parts deducted atomically from campus inventory; costs rolled into total cost.
                </p>
              </div>
            </div>

            {/* Add Part Form */}
            {(isAdmin || isTechnician) && (
              <form onSubmit={handleAddPart} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Select Part
                  </label>
                  <select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose spare part --</option>
                    {availableParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.partCode || 'NO-CODE'}] {p.name} (Stock: {p.stockQty}, ₹{p.unitCost?.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingPart}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addingPart ? 'Adding...' : '+ Consume Part'}
                </button>
              </form>
            )}

            {/* List of Used Parts */}
            {wo.parts && wo.parts.length > 0 ? (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Part Details</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      {(isAdmin || isTechnician) && <th className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {wo.parts.map((wp) => (
                      <tr key={wp.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-900">{wp.part?.name}</span>
                          <span className="block text-[10px] text-gray-400 font-mono">
                            {wp.part?.partCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                          {wp.quantityUsed}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          ₹{wp.unitCostAtTime?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{(wp.quantityUsed * wp.unitCostAtTime).toFixed(2)}
                        </td>
                        {(isAdmin || isTechnician) && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemovePart(wp.partId)}
                              className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                              title="Restores stock back to inventory"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No parts recorded for this work order.</p>
            )}
          </div>

          {/* Notes Thread */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">
              Work Notes &amp; Observations ({wo.notes?.length || 0})
            </h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Add technician comment, parts required, or resolution details..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Post Note
              </button>
            </form>

            <div className="space-y-2.5 pt-2">
              {wo.notes && wo.notes.length > 0 ? (
                wo.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-gray-400 text-[11px]">
                      <span className="font-semibold text-gray-700">
                        {note.author?.name} ({note.author?.role})
                      </span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No notes recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Timeline & Status History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">
              Status Transition Timeline (FR-07, FR-13)
            </h3>

            <div className="relative border-l-2 border-blue-500 ml-3 space-y-5 py-2">
              {wo.statusHistory &&
                wo.statusHistory.map((h, idx) => (
                  <div key={h.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white border-4 border-blue-600"></span>
                    <div className="text-xs">
                      <span className="font-bold text-gray-900">{h.toStatus}</span>
                      {h.fromStatus && (
                        <span className="text-gray-400 text-[10px] ml-1">
                          (from {h.fromStatus})
                        </span>
                      )}
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        By {h.changedBy?.name} ({h.changedBy?.role})
                      </p>
                      {h.reason && (
                        <p className="mt-1 p-2 bg-gray-50 rounded text-gray-700 text-[11px] italic">
                          &ldquo;{h.reason}&rdquo;
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Transition Status */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm Transition to {targetStatus.replace('_', ' ')}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              This transition will be recorded permanently in the work order status history.
            </p>

            <form onSubmit={handleStatusTransition} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  {targetStatus === 'ON_HOLD' ? 'Mandatory Hold Reason *' : 'Reason / Handover Note (Optional)'}
                </label>
                <textarea
                  required={targetStatus === 'ON_HOLD'}
                  rows={3}
                  placeholder={
                    targetStatus === 'ON_HOLD'
                      ? 'Specify why work is paused (e.g. Waiting for spare parts delivery)...'
                      : 'Add summary notes for this status update...'
                  }
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Execute Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Technician (Admin) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Maintenance Technician</h3>
            <form onSubmit={handleAssignTechnician} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Technician *</label>
                <select
                  required
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Choose technician...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Assign &amp; Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
