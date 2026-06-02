import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

export const VerificationSuccess: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [stage, setStage] = useState<'checking_token' | 'success' | 'error'>('checking_token');
  const [userName, setUserName] = useState('');
  const [errorMsg, setErrorMsg] = useState('Ce lien est expiré ou invalide.');

  useEffect(() => {
    const activateAccount = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setErrorMsg('Aucun jeton trouvé dans le lien.');
        setStage('error');
        return;
      }

      try {
        console.log('[VERIFY] Activating account with token:', token.substring(0, 8) + '...');
        // We directly hit /activate with just the token
        const res = await fetch(`${API_BASE_URL}/validations/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok && data.valid) {
          console.log('[VERIFY] Activation successful!');
          setUserName(data.name || '');
          setStage('success');
        } else {
          setErrorMsg(data.error || 'Échec de l\'activation. Veuillez réessayer.');
          setStage('error');
        }
      } catch (err) {
        console.error('[VERIFY] Network error:', err);
        setErrorMsg('Erreur réseau. Veuillez réessayer.');
        setStage('error');
      }
    };
    activateAccount();
  }, []);

  // ── Render: success ────────────────────────────────────────────────────────
  if (stage === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8f5e9] dark:bg-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 px-8 py-12 rounded-[24px] shadow-sm max-w-sm w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="rounded-full border-4 border-[#10b981] p-2">
            <CheckCircle className="w-16 h-16 text-[#10b981]" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-[28px] font-bold text-[#1e293b] dark:text-white mb-6 leading-tight">
          Bienvenue sur<br />Baladiya!
        </h1>
        {userName && (
          <p className="text-[17px] text-[#64748b] dark:text-slate-300 mb-6">
            Bonjour <strong>{userName}</strong>,
          </p>
        )}
        <p className="text-[#64748b] dark:text-slate-400 text-[15px] leading-relaxed mb-8">
          Vous êtes maintenant membre de<br />
          <strong>Baladiya Digital</strong>. Votre compte est<br />
          activé et vous pouvez maintenant vous<br />
          connecter.
        </p>
        <button
          onClick={onLogin}
          className="w-full bg-[#16a34a] hover:bg-green-700 text-white font-semibold
                     py-3.5 px-4 rounded-xl transition-colors duration-200 text-[16px]"
        >
          Se connecter
        </button>
      </div>
    </div>
  );

  // ── Render: loading / token-check ─────────────────────────────────────────
  if (stage === 'checking_token') return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8f5e9] dark:bg-slate-950">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-[#16a34a] mx-auto mb-4" />
        <p className="text-[#1e293b] dark:text-slate-400 font-medium">Activation de votre compte…</p>
      </div>
    </div>
  );

  // ── Render: error ──────────────────────────────────────────────────────────
  if (stage === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8f5e9] dark:bg-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-[24px] shadow-sm max-w-sm mx-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white mb-2">Lien invalide</h1>
        <p className="text-[#64748b] dark:text-slate-400">{errorMsg}</p>
      </div>
    </div>
  );

  return null;
};
