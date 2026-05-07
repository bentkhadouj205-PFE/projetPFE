import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

export const VerificationSuccess: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const verify = async () => {
      // Use standard Web API instead of react-router-dom
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (!token) { setStatus('error'); return; }
      try {
        console.log('[VERIFY] Sending token to backend:', token.substring(0, 8) + '...');
        const res = await fetch(`${API_BASE_URL}/validations/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();
        if (res.ok) {
          console.log(' [VERIFY] Activation successful!');
          setUserName(data.name || '');
          setStatus('success');
        } else {
          console.error(' [VERIFY] Backend rejected token:', data.error);
          setStatus('error');
        }
      } catch (err) {
        console.error(' [VERIFY] Network error:', err);
        setStatus('error');
      }
    };
    verify();
  }, []);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-slate-400 font-medium">Vérification en cours...</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md mx-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Lien invalide</h1>
        <p className="text-gray-500 dark:text-slate-400">Ce lien est expiré ou invalide.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md w-full mx-4 animate-in zoom-in duration-300">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
          Bienvenue sur Baladiya!
        </h1>
        {userName && (
          <p className="text-lg text-gray-600 dark:text-slate-300 mb-4">Bonjour <strong>{userName}</strong>,</p>
        )}
        <p className="text-gray-600 dark:text-slate-400 mb-4 text-sm">
          Vous êtes maintenant membre de <strong>Baladiya Digital</strong>.
          Votre compte est activé et vous pouvez maintenant vous connecter.
        </p>
      </div>
    </div>
  );
}
