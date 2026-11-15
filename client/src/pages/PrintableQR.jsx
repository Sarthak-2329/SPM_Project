import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function PrintableQR() {
  const { id } = useParams();
  const [labelData, setLabelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLabel() {
      try {
        const res = await api.get(`/assets/${id}/qr`);
        setLabelData(res.data);
      } catch (err) {
        console.error('Failed to load QR sticker:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLabel();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Generating printable barcode sticker...</div>;
  }

  if (!labelData) {
    return <div className="p-8 text-center text-red-500">Failed to generate label.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Control bar - hidden during print */}
      <div className="mb-6 flex gap-3 print:hidden">
        <Link
          to={`/assets/${id}`}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg"
        >
          &larr; Back to Asset
        </Link>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow"
        >
          🖨️ Print Label Sticker
        </button>
      </div>

      {/* The Printable Tag (Styled for standard physical asset sticker) */}
      <div className="bg-white border-2 border-black p-6 rounded-xl shadow-lg w-80 text-center font-sans print:shadow-none print:m-0 print:border-2 print:border-black">
        <div className="border-b-2 border-black pb-2 mb-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600">
            Campus Facilities Maintenance
          </p>
          <h2 className="text-base font-extrabold text-black">ASSET IDENTIFICATION TAG</h2>
        </div>

        <div className="my-3 flex justify-center">
          <img
            src={labelData.qrDataUrl}
            alt="Asset QR Code"
            className="w-48 h-48 border border-gray-300 p-1"
          />
        </div>

        <div className="border-t-2 border-black pt-2 space-y-1">
          <p className="font-mono text-lg font-black tracking-wider text-black">
            {labelData.assetCode}
          </p>
          <p className="text-xs font-bold text-gray-800 leading-tight">
            {labelData.name}
          </p>
          <p className="text-[11px] text-gray-600">
            📍 {labelData.locationName || 'Campus Main'}
          </p>
        </div>

        <div className="mt-3 pt-1 border-t border-gray-300 text-[9px] text-gray-500 uppercase">
          Scan to report faults or log inspection
        </div>
      </div>
    </div>
  );
}
