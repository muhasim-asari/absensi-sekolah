import React from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LogIn, LogOut, Loader2, User as UserIcon } from 'lucide-react';
import StudentView from './components/StudentView';
import TeacherView from './components/TeacherView';

function AppContent() {
  const { user, dbUser, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !dbUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <UserIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">School Attendance</h1>
            <p className="text-gray-500 mt-2">Sign in to record your attendance or manage student entries.</p>
          </div>
          <button
            onClick={login}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition"
          >
            <LogIn size={20} />
            <span className="font-medium">Sign in with Google</span>
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = dbUser.role === 'teacher';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">A</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">School Attendance</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{dbUser.name}</p>
              <p className="text-xs text-gray-500 capitalize">{dbUser.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isTeacher ? <TeacherView /> : <StudentView user={dbUser} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
