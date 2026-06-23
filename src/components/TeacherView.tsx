import React, { useEffect, useState } from 'react';
import { Download, Users, Loader2, Image as ImageIcon, MapPin, Trash2, UserPlus, Settings, Edit2 } from 'lucide-react';

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

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
}

export default function TeacherView() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'users'>('attendance');
  const [logs, setLogs] = useState<Log[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorDesc, setErrorDesc] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // User Form
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student', status: 'approved' });

  const token = localStorage.getItem('jwt_token') || '';

  const fetchLogsAndUsers = async () => {
    setLoading(true);
    setErrorDesc('');
    try {
      const [resLogs, resUsers] = await Promise.all([
        fetch(`/api/admin/attendance?startDate=${startDate}&endDate=${endDate}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (!resLogs.ok) throw new Error('Failed to fetch attendance data');
      if (!resUsers.ok) throw new Error('Failed to fetch users data');
      
      const dataLogs = await resLogs.json();
      const dataUsers = await resUsers.json();
      
      setLogs(dataLogs.logs || []);
      setUsers(dataUsers.users || []);
    } catch (e: any) {
      setErrorDesc(e.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      setErrorDesc(e.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') fetchLogsAndUsers();
    else fetchUsers();
  }, [activeTab, startDate, endDate]);

  const handleDeleteRange = async () => {
    if (!confirm(`Hapus SEMUA data kehadiran dari ${startDate} sampai ${endDate}? (Tidak bisa dikembalikan!)`)) return;
    try {
      const res = await fetch('/api/admin/attendance/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ startDate, endDate })
      });
      if (!res.ok) throw new Error('Failed to delete data');
      fetchLogs();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : `/api/admin/users`;
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userForm)
      });
      if (!res.ok) throw new Error(await res.text());
      setUserModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Hapus pengguna ini beserta semua data kehadirannya?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const exportToExcel = () => {
    const headers = ['Name', 'Email', 'Date', 'Time', 'Latitude', 'Longitude'];
    const viewData = logs.map(log => 
      [
        `"${log.userName}"`,
        `"${log.userEmail}"`,
        `"${log.date}"`,
        `"${log.time}"`,
        `"${log.latitude}"`,
        `"${log.longitude}"`
      ].join(',')
    );
    const csvContent = [headers.join(','), ...viewData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openUserModal = (u: User | null = null) => {
    if (u) {
      setEditingUser(u);
      setUserForm({ name: u.name, email: u.email, password: '', role: u.role, status: u.status });
    } else {
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role: 'teacher', status: 'approved' });
    }
    setUserModalOpen(true);
  };

  if (errorDesc && !logs.length && !users.length) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
        <p className="text-red-700 font-medium">Dashboard Admin Error</p>
        <p className="text-sm text-red-600 mt-2">{errorDesc}</p>
      </div>
    );
  }

  const totalTeachers = users.filter(u => u.role === 'teacher').length;
  const uniqueAttendees = new Set(logs.map(l => l.userEmail)).size;
  const missing = Math.max(0, totalTeachers - uniqueAttendees);

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'attendance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MapPin size={16} /> Kehadiran
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> Pengguna
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <span className="text-gray-500 text-sm font-medium mb-1">Total Guru</span>
              <span className="text-3xl font-bold text-gray-900">{totalTeachers}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-green-200 bg-green-50/30 shadow-sm flex flex-col justify-center">
              <span className="text-green-700 text-sm font-medium mb-1">Jumlah Hadir</span>
              <span className="text-3xl font-bold text-green-700">{uniqueAttendees}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-red-200 bg-red-50/30 shadow-sm flex flex-col justify-center">
              <span className="text-red-700 text-sm font-medium mb-1">Belum Hadir</span>
              <span className="text-3xl font-bold text-red-700">{missing}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-end">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDeleteRange} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition text-sm font-medium">
                <Trash2 size={16} /> Hapus Rentang Ini
              </button>
              <button onClick={exportToExcel} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded transition text-sm font-medium shadow-sm">
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama/Email</th>
                    <th className="px-6 py-4 font-medium">Waktu</th>
                    <th className="px-6 py-4 font-medium">Lokasi</th>
                    <th className="px-6 py-4 font-medium text-center">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? <tr><td colSpan={4} className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr> : ''}
                  {!loading && logs.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Tidak ada data kehadiran.</td></tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{log.userName}</p>
                        <p className="text-xs text-gray-500">{log.userEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 mb-1">{log.date}</span>
                        <p className="text-gray-900">{log.time}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${log.latitude},${log.longitude}`, '_blank')} className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                          <MapPin size={12} /> Google Maps
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.imageUrl ? (
                          <button onClick={() => setSelectedImage(log.imageUrl)} className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded transition border">
                            <ImageIcon size={16} />
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openUserModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium shadow-sm">
              <UserPlus size={16} /> Tambah Manual
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Akun</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? <tr><td colSpan={4} className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr> : ''}
                  {users.map((u) => (
                    <tr key={u.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {u.role === 'admin' ? 'Admin Super' : 'Guru'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.status === 'approved' ? 'bg-green-100 text-green-700' : u.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <button onClick={() => openUserModal(u)} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Image View */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Foto Kehadiran</h3>
              <button onClick={() => setSelectedImage(null)} className="text-gray-500 hover:text-gray-700">Tutup</button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <img src={selectedImage} alt="Attendance" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Modal User Edit/Add */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold mb-4">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input required type="text" value={userForm.name} onChange={e=>setUserForm({...userForm, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={userForm.email} onChange={e=>setUserForm({...userForm, email: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'Password Baru (Opsional)' : 'Password'}</label>
                <input required={!editingUser} type="text" placeholder={editingUser ? 'Kosongkan jika tidak diganti' : ''} value={userForm.password} onChange={e=>setUserForm({...userForm, password: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={userForm.role} onChange={e=>setUserForm({...userForm, role: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="teacher">Guru</option>
                    <option value="admin">Admin Super</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={userForm.status} onChange={e=>setUserForm({...userForm, status: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={()=>setUserModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
