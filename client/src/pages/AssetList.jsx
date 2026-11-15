import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AssetList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [assets, setAssets] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // New Asset Modal state (for Admin)
  const [showModal, setShowModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    categoryId: '',
    locationId: '',
    manufacturer: '',
    serialNo: '',
    purchaseDate: '',
    warrantyExpiry: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [formError, setFormError] = useState(null);

  const fetchFilters = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        api.get('/categories'),
        api.get('/locations'),
      ]);
      setCategories(catRes.data);
      setLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (locationId) params.locationId = locationId;
      if (status) params.status = status;

      const res = await api.get('/assets', { params });
      setAssets(res.data.items);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, categoryId, locationId, status]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const formData = new FormData();
      Object.keys(newAsset).forEach((k) => {
        if (newAsset[k]) formData.append(k, newAsset[k]);
      });
      if (selectedPhoto) {
        formData.append('photo', selectedPhoto);
      }

      await api.post('/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowModal(false);
      setNewAsset({
        name: '',
        categoryId: '',
        locationId: '',
        manufacturer: '',
        serialNo: '',
        purchaseDate: '',
        warrantyExpiry: '',
        status: 'ACTIVE',
        notes: '',
      });
      setSelectedPhoto(null);
      fetchAssets();
    } catch (err) {
      setFormError(err.message || 'Failed to create asset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Asset Registry</h1>
          <p className="text-sm text-gray-500">
            Physical facilities, lab equipment, HVAC, and power infrastructure ({meta.total} registered assets).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>➕</span> Register New Asset
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search code, name, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
            className="w-full text-sm border-none focus:outline-none"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="RETIRED">Retired</option>
        </select>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
          Loading assets catalogue...
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
          No assets found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {asset.assetCode}
                  </span>
                  <div className="flex gap-1.5">
                    {asset.isWarrantyExpired ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700">
                        Warranty Expired
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Under Warranty
                      </span>
                    )}

                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        asset.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asset.status === 'UNDER_MAINTENANCE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {asset.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1 mb-1">
                  {asset.name}
                </h3>

                <p className="text-xs text-blue-600 font-medium mb-3">
                  🏷️ {asset.category?.name}
                </p>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p className="flex items-center gap-1.5 truncate">
                    <span>📍</span> {asset.location?.name || 'Unassigned'}
                  </p>
                  {asset.manufacturer && (
                    <p className="truncate">
                      <span className="text-gray-400">Mfg:</span> {asset.manufacturer}
                    </p>
                  )}
                  {asset.serialNo && (
                    <p className="font-mono text-[11px] text-gray-400 truncate">
                      SN: {asset.serialNo}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <Link
                  to={`/assets/${asset.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  View Details &rarr;
                </Link>

                <Link
                  to={`/assets/${asset.id}/qr`}
                  className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded border"
                >
                  <span>📷</span> QR Label
                </Link>
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
            <span className="font-semibold">{meta.totalPages}</span> ({meta.total} assets)
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

      {/* Modal: Register New Asset (Admin) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Register New Physical Asset</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAsset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2.0 Ton Split Inverter AC"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Category *</label>
                  <select
                    required
                    value={newAsset.categoryId}
                    onChange={(e) => setNewAsset({ ...newAsset, categoryId: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Location Node *</label>
                  <select
                    required
                    value={newAsset.locationId}
                    onChange={(e) => setNewAsset({ ...newAsset, locationId: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Select Location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Daikin / Voltas"
                    value={newAsset.manufacturer}
                    onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-DK-2024-8991"
                    value={newAsset.serialNo}
                    onChange={(e) => setNewAsset({ ...newAsset, serialNo: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Purchase Date</label>
                  <input
                    type="date"
                    value={newAsset.purchaseDate}
                    onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={newAsset.warrantyExpiry}
                    onChange={(e) => setNewAsset({ ...newAsset, warrantyExpiry: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Asset Equipment Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedPhoto(e.target.files[0])}
                  className="mt-1 w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Technical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Installation details, sub-components..."
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Register &amp; Auto-Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
