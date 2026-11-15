import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAsset() {
      try {
        const res = await api.get(`/assets/${id}`);
        setAsset(res.data);
      } catch (err) {
        console.error('Failed to load asset:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAsset();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading asset specification...</div>;
  }

  if (!asset) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border">
        <h2 className="text-xl font-bold text-gray-800">Asset Not Found</h2>
        <Link to="/assets" className="mt-4 inline-block text-blue-600 font-semibold">
          &larr; Return to Assets Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/assets" className="text-sm font-semibold text-gray-500 hover:text-gray-800">
          &larr; Back to Assets
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/assets/${asset.id}/qr`}
            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5"
          >
            <span>🖨️</span> Print QR Sticker
          </Link>
          <button
            onClick={() => alert('Maintenance request flow active in Phase 3!')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>⚠️</span> Raise Maintenance Request
          </button>
        </div>
      </div>

      {/* Main Asset Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold px-3 py-1 rounded bg-slate-900 text-white">
                {asset.assetCode}
              </span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  asset.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : asset.status === 'UNDER_MAINTENANCE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {asset.status.replace('_', ' ')}
              </span>

              {asset.isWarrantyExpired ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-700">
                  Warranty Expired
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Warranty Active ({asset.warrantyDaysLeft} days remaining)
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900">{asset.name}</h1>
            <p className="text-sm font-semibold text-blue-600">🏷️ {asset.category?.name}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-sm">
              <div>
                <p className="text-xs text-gray-400">Campus Spatial Location</p>
                <p className="font-medium text-gray-800">
                  📍 {asset.location?.name} ({asset.location?.type})
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Manufacturer & Model</p>
                <p className="font-medium text-gray-800">{asset.manufacturer || 'Unspecified'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Serial Identification</p>
                <p className="font-mono text-gray-800">{asset.serialNo || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Purchase &amp; Commissioning Date</p>
                <p className="font-medium text-gray-800">
                  {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code and Asset Media */}
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 min-w-[200px]">
            {asset.qrCodeUrl ? (
              <img
                src={asset.qrCodeUrl}
                alt={`QR code for ${asset.assetCode}`}
                className="w-36 h-36 border-2 border-white rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-36 h-36 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded">
                No QR generated
              </div>
            )}
            <p className="text-[11px] font-mono font-bold text-gray-600 mt-2">{asset.assetCode}</p>
            <p className="text-[10px] text-gray-400 text-center">Scan with mobile camera to raise request</p>
          </div>
        </div>

        {asset.notes && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Installation &amp; Operating Notes
            </h4>
            <p className="text-sm text-gray-700">{asset.notes}</p>
          </div>
        )}
      </div>

      {/* Maintenance History & PM Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Work Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 text-base flex items-center justify-between">
            <span>Recent Work Orders</span>
            <span className="text-xs font-normal text-gray-400">Total: {asset.workOrders?.length || 0}</span>
          </h3>

          {!asset.workOrders || asset.workOrders.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No work orders recorded for this asset yet.</p>
          ) : (
            <div className="space-y-2">
              {asset.workOrders.map((wo) => (
                <div key={wo.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{wo.title}</p>
                    <p className="text-gray-400">{new Date(wo.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {wo.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preventive Maintenance Schedules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 text-base flex items-center justify-between">
            <span>Preventive Maintenance Cycles</span>
            <span className="text-xs font-normal text-gray-400">Active Schedules</span>
          </h3>

          {!asset.pmSchedules || asset.pmSchedules.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No active PM schedule configured.</p>
          ) : (
            <div className="space-y-2">
              {asset.pmSchedules.map((pm) => (
                <div key={pm.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{pm.name}</p>
                    <p className="text-gray-400">Every {pm.frequencyDays} days</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Due: {new Date(pm.nextDueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
