import React, { useEffect, useState } from 'react';
import { Download, Users, Loader2, Image as ImageIcon } from 'lucide-react';
import { auth } from '../lib/firebase';

interface Log {
  id: number;
  userName: string;
  userEmail: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
}

export default function TeacherView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDesc, setErrorDesc] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setErrorDesc('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      setLogs(data.logs);
    } catch (e: any) {
      setErrorDesc(e.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportToExcel = () => {
    // Exclude image content from excel to keep file size reasonable
    const headers = ['Name', 'Email', 'Date', 'Time', 'Location'];
    const viewData = logs.map(log => 
      [
        `"${log.userName}"`,
        `"${log.userEmail}"`,
        `"${log.date}"`,
        `"${log.time}"`,
        `"Lat: ${log.latitude}, Lng: ${log.longitude}"`
      ].join(',')
    );
    const csvContent = [headers.join(','), ...viewData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Recap_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorDesc) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
        <p className="text-red-700 font-medium">Wait! You don't have permission.</p>
        <p className="text-sm text-red-600 mt-2">Only accounts with teacher roles can access this dashboard. Check with administrator to upgrade your role.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Attendance Recap
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review all student attendance logs.</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium shadow-sm"
        >
          <Download size={16} />
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium text-center">Photo</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="bg-white border-b hover:bg-gray-50 last:border-0 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{log.userName}</p>
                      <p className="text-xs text-gray-500">{log.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 mb-1">
                        {log.date}
                      </span>
                      <p className="text-gray-900">{log.time}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {(Number(log.latitude) || 0).toFixed(4)},<br />{(Number(log.longitude) || 0).toFixed(4)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(log.imageUrl)}
                          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-lg transition border border-gray-200 hover:border-blue-200"
                        >
                          <ImageIcon size={20} />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Attendance Photo</h3>
              <button onClick={() => setSelectedImage(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <img src={selectedImage} alt="Attendance verification" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
