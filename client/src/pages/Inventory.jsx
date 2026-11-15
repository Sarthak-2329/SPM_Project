import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [parts, setParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Modals
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [savingPart, setSavingPart] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Form states
  const [partForm, setPartForm] = useState({
    name: '',
    partCode: '',
    description: '',
    unitCost: '',
    stockQty: 10,
    reorderLevel: 5,
    supplierId: '',
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
  });

  const fetchParts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowStockFilter) params.append('lowStock', 'true');
      if (selectedSupplier) params.append('supplierId', selectedSupplier);
      params.append('limit', '100');

      const res = await api.get(`/parts?${params.toString()}`);
      setParts(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchParts();
    fetchSuppliers();
  }, [lowStockFilter, selectedSupplier]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchParts();
  };

  const handleCreatePart = async (e) => {
    e.preventDefault();
    setSavingPart(true);
    try {
      await api.post('/parts', {
        ...partForm,
        unitCost: parseFloat(partForm.unitCost),
        stockQty: parseInt(partForm.stockQty, 10),
        reorderLevel: parseInt(partForm.reorderLevel, 10),
      });
      setShowAddPartModal(false);
      setPartForm({
        name: '',
        partCode: '',
        description: '',
        unitCost: '',
        stockQty: 10,
        reorderLevel: 5,
        supplierId: '',
      });
      fetchParts();
    } catch (err) {
      alert(err.message || 'Failed to create part');
    } finally {
      setSavingPart(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      await api.post('/suppliers', supplierForm);
      setSupplierForm({ name: '', contactName: '', email: '', phone: '', address: '' });
      fetchSuppliers();
      alert('Supplier registered successfully!');
    } catch (err) {
      alert(err.message || 'Failed to add supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📦</span> Spare Parts & Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catalogue, real-time stock levels, reorder alerts, and supplier tracking (FR-09)
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSuppliersModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold border border-slate-300 transition"
            >
              🏢 Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => setShowAddPartModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition"
            >
              <span>+</span> Add Spare Part
            </button>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search part name, code, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading inventory records...</div>
        ) : parts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No parts found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Part Code</th>
                  <th className="py-3.5 px-4">Part Name & Description</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Stock on Hand</th>
                  <th className="py-3.5 px-4">Reorder Level</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                      {p.partCode || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{p.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      ₹{p.unitCost?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <span className={p.isLowStock ? 'text-rose-600' : ''}>{p.stockQty}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{p.reorderLevel}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {p.supplier ? (
                        <div>
                          <div className="font-semibold text-slate-800">{p.supplier.name}</div>
                          <div className="text-slate-400">{p.supplier.phone || p.supplier.contactName}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                          <span>⚠️</span> LOW STOCK
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Part Modal */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add New Spare Part</h3>
              <button
                onClick={() => setShowAddPartModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Part Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRT-AC-09"
                    value={partForm.partCode}
                    onChange={(e) => setPartForm({ ...partForm, partCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="450.00"
                    value={partForm.unitCost}
                    onChange={(e) => setPartForm({ ...partForm, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Part Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-inch Brass Ball Valve"
                  value={partForm.name}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Specifications, size, model compatibility..."
                  value={partForm.description}
                  onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Initial Stock Qty *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={partForm.stockQty}
                    onChange={(e) => setPartForm({ ...partForm, stockQty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Reorder Threshold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={partForm.reorderLevel}
                    onChange={(e) => setPartForm({ ...partForm, reorderLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Supplier
                </label>
                <select
                  value={partForm.supplierId}
                  onChange={(e) => setPartForm({ ...partForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Vendor / Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPart}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow disabled:opacity-50"
                >
                  {savingPart ? 'Saving...' : 'Save Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Suppliers Modal */}
      {showSuppliersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Approved Suppliers Directory</h3>
              <button
                onClick={() => setShowSuppliersModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Add Supplier Form */}
            <form onSubmit={handleCreateSupplier} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add New Supplier</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Supplier / Company Name *"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
                <input
                  type="text"
                  placeholder="Contact Person"
                  value={supplierForm.contactName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
              <input
                type="text"
                placeholder="Physical Warehouse / Office Address"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900"
                >
                  {savingSupplier ? 'Saving...' : '+ Register Supplier'}
                </button>
              </div>
            </form>

            {/* List */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Vendors</h4>
              {suppliers.map((s) => (
                <div key={s.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                  <div>
                    <h5 className="font-semibold text-slate-800">{s.name}</h5>
                    <p className="text-xs text-slate-500">
                      Contact: {s.contactName || 'N/A'} • {s.phone || 'No phone'} • {s.email || 'No email'}
                    </p>
                    {s.address && <p className="text-[11px] text-slate-400 mt-0.5">{s.address}</p>}
                  </div>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                    {s._count?.parts || 0} parts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
