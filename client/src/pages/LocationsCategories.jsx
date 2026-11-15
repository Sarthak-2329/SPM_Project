import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function LocationsCategories() {
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('locations');
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [newLoc, setNewLoc] = useState({ name: '', type: 'ROOM', parentId: '' });
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [showLocModal, setShowLocModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, catRes] = await Promise.all([
        api.get('/locations'),
        api.get('/categories'),
      ]);
      setLocations(locRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLoc = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locations', {
        name: newLoc.name,
        type: newLoc.type,
        parentId: newLoc.parentId || null,
      });
      setShowLocModal(false);
      setNewLoc({ name: '', type: 'ROOM', parentId: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create location');
    }
  };

  const handleCreateCat = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', {
        name: newCat.name,
        description: newCat.description || null,
      });
      setShowCatModal(false);
      setNewCat({ name: '', description: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Facilities Hierarchy & Categories</h1>
          <p className="text-sm text-gray-500">
            Define spatial nodes (Campus &gt; Building &gt; Floor &gt; Room) and asset functional categories.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'locations' ? (
            <button
              onClick={() => setShowLocModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              ➕ Add Location Node
            </button>
          ) : (
            <button
              onClick={() => setShowCatModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              ➕ Add Category
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'locations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📍 Spatial Locations ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏷️ Asset Categories ({categories.length})
        </button>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading hierarchy...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Location Name</th>
                  <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Hierarchy Level</th>
                  <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Parent Node</th>
                  <th className="px-6 py-3.5 text-right font-semibold text-gray-600">Assets Tagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50/80">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{loc.name}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {loc.type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{loc.parent ? loc.parent.name : '— (Root)'}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-gray-700">
                      {loc._count?.assets || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading categories...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Category Name</th>
                  <th className="px-6 py-3.5 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-6 py-3.5 text-right font-semibold text-gray-600">Assets Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/80">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{cat.name}</td>
                    <td className="px-6 py-3.5 text-gray-600">{cat.description || '—'}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-gray-700">
                      {cat._count?.assets || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Add Location */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Spatial Location Node</h3>
            <form onSubmit={handleCreateLoc} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Lab 301"
                  value={newLoc.name}
                  onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Level *</label>
                <select
                  value={newLoc.type}
                  onChange={(e) => setNewLoc({ ...newLoc, type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="CAMPUS">Campus</option>
                  <option value="BUILDING">Building</option>
                  <option value="FLOOR">Floor</option>
                  <option value="ROOM">Room / Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Parent Location</label>
                <select
                  value={newLoc.parentId}
                  onChange={(e) => setNewLoc({ ...newLoc, parentId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">None (Top-Level)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLocModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Category */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Asset Category</h3>
            <form onSubmit={handleCreateCat} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fire Safety & Extinguishers"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Scope and equipment types covered..."
                  value={newCat.description}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
