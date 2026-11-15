import { useState, useEffect } from 'react';
import api from '../api/axios';

const REPORT_TYPES = [
  { id: 'WORK_ORDERS', label: 'Work Orders Report', desc: 'All maintenance orders with status, labor hours, and costs' },
  { id: 'ASSET_HISTORY', label: 'Asset Maintenance History', desc: 'Comprehensive asset servicing history and lifetime costs' },
  { id: 'COST_ANALYSIS', label: 'Cost Analysis Report', desc: 'Detailed financial breakdown of replacement parts and labor' },
  { id: 'INVENTORY', label: 'Spare Parts & Inventory', desc: 'Stock quantities, unit valuations, and low-stock indicators' },
];

export default function Reports() {
  const [reportType, setReportType] = useState('WORK_ORDERS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const res = await api.get(`/reports/preview?${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate report preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [reportType]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchPreview();
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    const token = localStorage.getItem('token');
    const url = `/api/reports/export/csv?${params.toString()}`;

    // Direct browser trigger with auth header via fetch blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `CMMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download CSV export.'));
  };

  const handleDownloadPdf = () => {
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    const token = localStorage.getItem('token');
    const url = `/api/reports/export/pdf?${params.toString()}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `CMMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download PDF export.'));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📑</span> Executive Reports &amp; Compliance Data Exports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filterable tabular reporting with structured CSV and branded PDF document generation (FR-12)
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <span>📥</span> Download CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <span>📄</span> Download PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {REPORT_TYPES.map((rt) => {
          const isSelected = reportType === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`p-3.5 rounded-xl border text-left transition ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                {rt.label}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{rt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <form
        onSubmit={handleApplyFilters}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">End Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
          />
        </div>

        {reportType === 'WORK_ORDERS' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 ml-auto"
        >
          Apply Filters
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Report Preview Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">
            {reportData?.title || 'Report Preview'} ({reportData?.totalCount || 0} records)
          </span>
          <span className="text-slate-400">
            Generated: {reportData ? new Date(reportData.generatedAt).toLocaleTimeString() : '—'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Compiling report data...</div>
        ) : !reportData || reportData.totalCount === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No records match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            {/* WORK ORDERS PREVIEW */}
            {reportType === 'WORK_ORDERS' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">WO #</th>
                    <th className="py-2.5 px-3">Title &amp; Scope</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3 text-right">Cost (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reportData.data.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-600">{wo.id.slice(-6).toUpperCase()}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{wo.title}</td>
                      <td className="py-2 px-3">{wo.asset?.assetCode}</td>
                      <td className="py-2 px-3 font-bold text-[10px] uppercase">{wo.priority}</td>
                      <td className="py-2 px-3 font-semibold">{wo.status}</td>
                      <td className="py-2 px-3">{wo.assignee?.name || 'Unassigned'}</td>
                      <td className="py-2 px-3">{wo.timeSpent || 0} hrs</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{(wo.actualCost || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ASSET HISTORY PREVIEW */}
            {reportType === 'ASSET_HISTORY' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Total WOs</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Maintenance Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reportData.data.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-600">{a.assetCode}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-2 px-3">{a.category?.name}</td>
                      <td className="py-2 px-3">{a.location?.name}</td>
                      <td className="py-2 px-3">{a.status}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{a.totalWorkOrders}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{a.totalMaintenanceCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* COST ANALYSIS PREVIEW */}
            {reportType === 'COST_ANALYSIS' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Work Order &amp; Asset</th>
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3">Labor Hours</th>
                    <th className="py-2.5 px-3 text-right">Labor Spend</th>
                    <th className="py-2.5 px-3 text-right">Parts Spend</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reportData.data.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{c.title}</span>
                        <span className="block font-mono text-[10px] text-blue-600">{c.assetCode}</span>
                      </td>
                      <td className="py-2 px-3">{c.technician}</td>
                      <td className="py-2 px-3">{c.laborHours}h</td>
                      <td className="py-2 px-3 text-right">₹{c.laborCost.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">₹{c.partsCost.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{c.totalCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* INVENTORY PREVIEW */}
            {reportType === 'INVENTORY' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Part Code</th>
                    <th className="py-2.5 px-3">Part Name</th>
                    <th className="py-2.5 px-3">Unit Cost</th>
                    <th className="py-2.5 px-3">Stock on Hand</th>
                    <th className="py-2.5 px-3">Reorder Threshold</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation</th>
                    <th className="py-2.5 px-3">Stock Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reportData.data.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-600">{p.partCode || 'N/A'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-2 px-3">₹{p.unitCost.toFixed(2)}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{p.stockQty}</td>
                      <td className="py-2 px-3 text-slate-500">{p.reorderLevel}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        ₹{p.totalValuation.toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        {p.isLowStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
