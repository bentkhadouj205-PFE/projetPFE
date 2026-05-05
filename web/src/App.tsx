import { useState, useEffect } from 'react';
import { LoginPage } from '@/sections/LoginPage';
import { MunicipalAgentDashboard } from '@/sections/AdminDashboard';
import { EmployeeDashboard } from '@/sections/EmployeeDashboard';
import { VerificationSuccess } from '@/sections/VerificationSuccess';
import { useRealRequests } from '@/hooks/useRealRequests';
import { useAdminData } from '@/hooks/useAdminData';
import { useNotifications } from '@/hooks/useNotifications';
import { Toaster } from '@/components/ui/sonner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { API_BASE_URL } from '@/lib/apiBase';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';

export type Vue = 'connexion' | 'municipal_agent' | 'employe' | 'verification_success';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Municipal_Agent' | 'employee';
  service: string;
  position: string;
  joinDate: string;
}

function App() {
  // 1. Theme and Auth Hooks
  const { isDark, toggleDarkMode } = useDarkMode();
  const { user, login: authLogin, logout: authLogout, updateUser } = useAuth();

  // 2. State Hooks
  const [vueActuelle, setVueActuelle] = useState<Vue>(() => {
    // Check for verification token in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return 'verification_success';

    const saved = localStorage.getItem('user');
    if (saved) {
      const u = JSON.parse(saved);
      return u.role === 'employee' ? 'employe' : 'municipal_agent';
    }
    return 'connexion';
  });

  // 3. Socket Hook
  const { notifications: socketNotifications } = useSocket(
    user?.id || '',
    user?.role || ''
  );

  // 4. Data Hooks (Stable order)
  const { requests, loading, fetchRequests, getTasksByEmployee, completeTask, updateTask } = useRealRequests(
    user?.role === 'employee' ? user.id : ''
  );

  const { employees: adminEmployees, loading: adminLoading } = useAdminData(
    vueActuelle === 'municipal_agent'
  );

  const notificationsState = useNotifications(
    user?.role === 'employee' ? user.id : '',
    user?.role === 'employee' ? user.service : ''
  );

  // 5. Effect Hooks
  useEffect(() => {
    if (socketNotifications.length > 0) {
      console.log('New notification via Socket:', socketNotifications[0]);
    }
  }, [socketNotifications]);

  useEffect(() => {
    if (user && user.role === 'employee') {
      console.log('USER LOGGED IN:', user);
      fetchRequests(user.service);
    }
  }, [user, fetchRequests, vueActuelle]);

  // ───────────── Login ─────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const success = authLogin(email, password); // useAuth mock login
      if (success) {
        const saved = localStorage.getItem('user');
        const u = saved ? JSON.parse(saved) : null;
        if (u) {
          // IMPORTANT: Check for 'Municipal_Agent' role correctly
          setVueActuelle(u.role === 'Municipal_Agent' || u.role === 'municipal_agent' ? 'municipal_agent' : 'employe');
          console.log('USER LOGGED IN:', u.id, 'ROLE:', u.role);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // ───────────── Logout ─────────────
  const logout = () => {
    authLogout();
    setVueActuelle('connexion');
  };

  const isLoading =
    (vueActuelle === 'employe' && loading) ||
    (vueActuelle === 'municipal_agent' && adminLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    );
  }
  // ───────────── Render ─────────────
  switch (vueActuelle) {
    case 'connexion':
      return (
        <>
          <LoginPage onLogin={login as any} isDark={isDark} toggleDarkMode={toggleDarkMode} />
          <Toaster />
        </>
      );

    case 'municipal_agent':
      return (
        <>
          <MunicipalAgentDashboard
            user={user as any}
            onLogout={logout}
            employees={{
              employees: adminEmployees,
              getEmployeeById: (id: string) =>
                adminEmployees.find((e: any) => e._id === id || e.id === id),
            } as any}
            tasks={{ tasks: requests, updateTask, completeTask, getTasksByEmployee } as any}
            isDark={isDark}
            toggleDarkMode={toggleDarkMode}
          />
          <Toaster />
        </>
      );
    case 'employe':
      return (
        <>
          <EmployeeDashboard
            user={user as any}
            onLogout={logout}
            onUpdateUser={updateUser as any}
            tasks={{ tasks: requests, updateTask, completeTask, getTasksByEmployee } as any}
            isDark={isDark}
            toggleDarkMode={toggleDarkMode}
            notifications={notificationsState as any}
          />
          <Toaster />
        </>
      );

    case 'verification_success':
      return (
        <>
          <VerificationSuccess onLogin={() => setVueActuelle('connexion')} />
          <Toaster />
        </>
      );

    default:
      return (
        <>
          <LoginPage onLogin={login as any} isDark={isDark} toggleDarkMode={toggleDarkMode} />
          <Toaster />
        </>
      );
  }
}

export default App;