import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, Eye, EyeOff, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

type Stage = 'checking_token' | 'set_password' | 'activating' | 'success' | 'error';

export const VerificationSuccess: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [stage, setStage]         = useState<Stage>('checking_token');
  const [token, setToken]         = useState('');
  const [userName, setUserName]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('Ce lien est expiré ou invalide.');

  // Password-form state
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [formError, setFormError]         = useState('');

  // ── Step 1: Validate the token on load (just check it exists in DB) ────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');

    if (!t) {
      setErrorMsg('Aucun jeton trouvé dans le lien.');
      setStage('error');
      return;
    }

    setToken(t);

    // Quick verify: check token is valid without activating yet
    fetch(`${API_BASE_URL}/validations/verify-token?token=${t}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          // Token is valid → show the Set Password form
          setUserName(data.prenom || '');
          setStage('set_password');
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

  // ── Step 2: Submit password form → call /activate with token + password ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }

    setStage('activating');

    try {
      console.log('[VERIFY] Activating account with token:', token.substring(0, 8) + '...');
      const res = await fetch(`${API_BASE_URL}/validations/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),   // ✅ send both token AND password
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        console.log('[VERIFY] Activation successful!');
        setUserName(data.name || userName);
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

  // ── Render: loading / token-check ─────────────────────────────────────────
  if (stage === 'checking_token' || stage === 'activating') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-slate-400 font-medium">
          {stage === 'checking_token' ? 'Vérification en cours…' : 'Activation de votre compte…'}
        </p>
      </div>
    </div>
  );

  // ── Render: error ──────────────────────────────────────────────────────────
  if (stage === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md mx-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Lien invalide</h1>
        <p className="text-gray-500 dark:text-slate-400">{errorMsg}</p>
      </div>
    </div>
  );

  // ── Render: set-password form ─────────────────────────────────────────────
  if (stage === 'set_password') return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8f5e9] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[24px] shadow-sm max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <Lock className="w-16 h-16 text-[#10b981] stroke-[2.5]" />
        </div>
        <h1 className="text-[26px] font-bold text-[#1e293b] dark:text-white text-center mb-2">
          Définissez votre mot de passe
        </h1>
        <p className="text-center text-[#64748b] dark:text-slate-400 mb-8 text-[15px]">
          Bonjour <strong>{userName}</strong>, choisissez un mot de passe pour activer<br/>votre compte.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password */}
          <div>
            <label className="block text-[15px] font-medium text-[#1e293b] dark:text-slate-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 caractères"
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 pr-10
                           bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                           focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[15px] font-medium text-[#1e293b] dark:text-slate-300 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 pr-10
                           bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                           focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Inline form error */}
          {formError && (
            <p className="text-red-500 text-sm text-center">{formError}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#16a34a] hover:bg-green-700 text-white font-semibold
                         py-3.5 px-4 rounded-xl transition-colors duration-200 text-[16px]"
            >
              Activer mon compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );

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
};
