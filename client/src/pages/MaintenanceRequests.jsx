import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function MaintenanceRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [newRequest, setNewRequest] = useState({
    description: '',
    priority: 'MEDIUM',
    assetId: '',
  });
  const [approveData, setApproveData] = useState({
    title: '',
    assigneeId: '',
    dueDate: '',
    priority: 'MEDIUM',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await api.get('/requests', { params });
      setRequests(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [assetsRes, usersRes] = await Promise.all([
        api.get('/assets?limit=100'),
        isAdmin ? api.get('/users?role=TECHNICIAN') : Promise.resolve({ data: { items: [] } }),
      ]);
      setAssets(assetsRes.data.items);
      if (isAdmin) setTechnicians(usersRes.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAuxData();
  }, [statusFilter, priorityFilter]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('description', newRequest.description);
      formData.append('priority', newRequest.priority);
      if (newRequest.assetId) formData.append('assetId', newRequest.assetId);
      if (photoFile) formData.append('photo', photoFile);

      await api.post('/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowSubmitModal(false);
      setNewRequest({ description: '', priority: 'MEDIUM', assetId: '' });
      setPhotoFile(null);
      fetchRequests();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit maintenance request');
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/requests/${selectedRequest.id}/approve`, {
        title: approveData.title || undefined,
        assigneeId: approveData.assigneeId || undefined,
        dueDate: approveData.dueDate || undefined,
        priority: approveData.priority,
      });
      setShowApproveModal(false);
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/requests/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Campus Maintenance Requests Queue' : 'My Reported Requests'}
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? 'Review, approve and dispatch technician work orders for reported campus faults.'
              : 'Track status of maintenance requests reported by you.'}
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>➕</span> Report Maintenance Fault
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved (Work Order Created)</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <button
          onClick={fetchRequests}
          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No requests found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Request / Fault</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Asset / Location</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Priority</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Status</th>
                {isAdmin && <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Requester</th>}
                <th className="px-6 py-3.5 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition">
                  <td className="px-6 py-4 max-w-xs">
                    <p className="font-semibold text-gray-900 leading-snug line-clamp-2">
                      {r.description}
                    </p>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-xs text-gray-700">
                    {r.asset ? (
                      <div>
                        <span className="font-mono font-bold text-slate-800">{r.asset.assetCode}</span>
                        <p className="text-gray-500 truncate">{r.asset.name}</p>
                      </div>
                    ) : (
                      <span>📍 {r.location?.name || 'General Campus'}</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        r.priority === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : r.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : r.priority === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.priority}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        r.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.workOrder && (
                      <p className="text-[11px] text-blue-600 mt-1 font-medium">
                        WO #{r.workOrder.id.slice(-6)} ({r.workOrder.status})
                      </p>
                    )}
                    {r.rejectionReason && (
                      <p className="text-[11px] text-rose-600 mt-1 truncate" title={r.rejectionReason}>
                        Reason: {r.rejectionReason}
                      </p>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="px-6 py-4 text-xs">
                      <p className="font-semibold text-gray-800">{r.requester?.name}</p>
                      <p className="text-gray-500 text-[11px]">{r.requester?.email}</p>
                    </td>
                  )}

                  <td className="px-6 py-4 text-right">
                    {isAdmin && r.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setApproveData({
                              title: `Repair: ${r.asset?.name || 'Fault'}`,
                              priority: r.priority,
                              assigneeId: '',
                              dueDate: '',
                            });
                            setShowApproveModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowRejectModal(true);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Report Fault Request */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Report Maintenance Fault</h3>
            {errorMsg && <div className="p-3 mb-3 bg-red-50 text-red-700 text-xs rounded-lg">{errorMsg}</div>}
            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Problem Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue, noise, leakage, or breakdown..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Associated Asset (Optional)</label>
                <select
                  value={newRequest.assetId}
                  onChange={(e) => setNewRequest({ ...newRequest, assetId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">No specific asset / General location</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] {a.name} ({a.location?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Urgency / Priority *</label>
                <select
                  value={newRequest.priority}
                  onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="LOW">Low (Cosmetic, minor)</option>
                  <option value="MEDIUM">Medium (Normal fault)</option>
                  <option value="HIGH">High (Urgent disruption)</option>
                  <option value="CRITICAL">Critical (Safety hazard / total outage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Upload Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="mt-1 w-full text-xs text-gray-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Submit Fault Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Approve & Convert to Work Order (Admin) */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve &amp; Generate Work Order</h3>
            <p className="text-xs text-gray-500 mb-4">
              Approving converts this request into a formal Work Order in a single database transaction.
            </p>

            <form onSubmit={handleApprove} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Work Order Title *</label>
                <input
                  type="text"
                  required
                  value={approveData.title}
                  onChange={(e) => setApproveData({ ...approveData, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Assign Maintenance Tech</label>
                <select
                  value={approveData.assigneeId}
                  onChange={(e) => setApproveData({ ...approveData, assigneeId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Leave Unassigned (OPEN status)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Target Due Date</label>
                  <input
                    type="date"
                    value={approveData.dueDate}
                    onChange={(e) => setApproveData({ ...approveData, dueDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Work Priority</label>
                  <select
                    value={approveData.priority}
                    onChange={(e) => setApproveData({ ...approveData, priority: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
                >
                  Generate Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reject Request (Admin) */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Decline Maintenance Request</h3>
            <p className="text-xs text-gray-500 mb-4">
              Please specify a clear explanation for the requester.
            </p>

            <form onSubmit={handleReject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Duplicate issue already being handled under WO-0021..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
