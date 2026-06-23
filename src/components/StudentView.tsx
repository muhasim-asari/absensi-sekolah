import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Upload, CheckCircle, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function StudentView({ user }: { user: any }) {
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');
  const [type, setType] = useState('berangkat');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get location on mount
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          setErrorDesc('Could not get location. Ensure location permissions are enabled.');
          console.error(err);
        }
      );
    } else {
      setErrorDesc('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setSubmitting(true);
        const options = {
          maxSizeMB: 0.07, // 70kb
          maxWidthOrHeight: 800,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
          setSubmitting(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error(error);
        setErrorDesc("Gagal kompres gambar.");
        setSubmitting(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setErrorDesc('Please provide a photo first.');
      return;
    }
    if (!location) {
      setErrorDesc('Please enable location to submit attendance.');
      return;
    }

    setSubmitting(true);
    setErrorDesc('');
    try {
      let token = null;
      try { token = localStorage.getItem('jwt_token'); } catch (e) {}
      
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl: image,
          latitude: location.lat,
          longitude: location.lng,
          date,
          time,
          type
        })
      });

      if (!res.ok) {
        throw new Error('Failed to record attendance');
      }

      setSuccess(true);
    } catch (e: any) {
      setErrorDesc(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-semibold text-gray-900">Kehadiran Tersimpan!</h2>
        <p className="text-gray-500">Anda telah berhasil mencatat kehadiran untuk hari ini.</p>
        <button 
          onClick={() => { setSuccess(false); setImage(null); }}
          className="mt-4 px-6 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition"
        >
          Check In Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-6">Sistem Absensi Harian</h2>
        
        {errorDesc && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            {errorDesc}
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Camera className="w-4 h-4" /> 
              Langkah 1: Ambil Foto
            </h3>
            
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center overflow-hidden transition-colors hover:border-blue-400 group h-64">
              {image ? (
                <>
                  <img src={image} alt="Selfie" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium shadow-sm">
                      Foto Ulang
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  className="flex flex-col items-center text-gray-400 cursor-pointer w-full h-full justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-3" />
                  <p className="text-sm">Klik untuk buka kamera atau pilih gambar</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> 
              Langkah 2: Verifikasi Lokasi
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-between">
              {location ? (
                <div>
                  <p className="text-sm font-medium text-green-700">Lokasi Ditemukan</p>
                  <p className="text-xs text-gray-500 mt-1">Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Mendapatkan lokasi...</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Upload className="w-4 h-4" /> 
              Langkah 3: Jenis Kehadiran
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('berangkat')}
                className={`py-3 px-4 flex justify-center items-center rounded-lg border-2 font-medium transition ${type === 'berangkat' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Berangkat
              </button>
              <button
                type="button"
                onClick={() => setType('pulang')}
                className={`py-3 px-4 flex justify-center items-center rounded-lg border-2 font-medium transition ${type === 'pulang' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Pulang
              </button>
            </div>
          </div>

          <div className="pt-4 mt-8 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={submitting || !image || !location}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
               <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Menyimpan...
               </>
              ) : (
                'Simpan Kehadiran'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
