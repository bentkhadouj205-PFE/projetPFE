import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

type Stage = 'checking_token' | 'activating' | 'success' | 'error';

export const VerificationSuccess: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [stage, setStage] = useState<Stage>('checking_token');
  const [userName, setUserName] = useState('');
  const [errorMsg, setErrorMsg] = useState('Ce lien est expiré ou invalide.');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');

    if (!t) {
      setErrorMsg('Aucun jeton trouvé dans le lien.');
      setStage('error');
      return;
    }

    setStage('activating');

    // Directly activate — no password needed
    fetch(`${API_BASE_URL}/validations/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setUserName(data.name || '');
          setStage('success');
        } else {
          setErrorMsg(data.error || 'Lien invalide ou expiré.');
          setStage('error');
        }
      })
      .catch(() => {
        setErrorMsg('Erreur réseau. Veuillez réessayer.');
        setStage('error');
      });
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (stage === 'checking_token' || stage === 'activating') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-slate-400 font-medium">
          Activation de votre compte…
        </p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md mx-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Lien invalide</h1>
        <p className="text-gray-500 dark:text-slate-400">{errorMsg}</p>
      </div>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md w-full mx-4 animate-in zoom-in duration-300">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">Bienvenue sur Baladiya!</h1>
        {userName && (
          <p className="text-lg text-gray-600 dark:text-slate-300 mb-2">
            Bonjour <strong>{userName}</strong>,
          </p>
        )}
        <p className="text-gray-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
          Vous êtes maintenant membre de <strong className="text-gray-700 dark:text-slate-200">Baladiya Digital</strong>. Votre compte est activé et vous pouvez maintenant vous connecter.
        </p>

      </div>
    </div>
  );
};
