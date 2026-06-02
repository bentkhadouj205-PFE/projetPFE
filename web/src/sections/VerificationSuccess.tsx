import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, Eye, EyeOff, Lock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';

type Stage = 'checking_token' | 'set_password' | 'activating' | 'success' | 'error';

export const VerificationSuccess: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [stage, setStage] = useState<Stage>('checking_token');
  const [token, setToken] = useState('');
  const [userName, setUserName] = useState('');
  const [errorMsg, setErrorMsg] = useState('Ce lien est expiré ou invalide.');

  // Password-form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');

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
        body: JSON.stringify({ token, password }),   //  send both token AND password
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-950">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md w-full mx-4 animate-in zoom-in duration-300">
        <Lock className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-1">
          Définissez votre mot de passe
        </h1>
        {userName && (
          <p className="text-center text-gray-500 dark:text-slate-400 mb-6 text-sm">
            Bonjour <strong>{userName}</strong>, choisissez un mot de passe pour activer votre compte.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10
                           bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10
                           bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Inline form error */}
          {formError && (
            <p className="text-red-500 text-sm">{formError}</p>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold
                       py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Activer mon compte
          </button>
        </form>
      </div>
    </div>
  );

  // ── Render: success ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-950">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-lg max-w-md w-full mx-4 animate-in zoom-in duration-300">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
          Bienvenue sur Baladiya!
        </h1>
        {userName && (
          <p className="text-lg text-gray-600 dark:text-slate-300 mb-2">
            Bonjour <strong>{userName}</strong>,
          </p>
        )}
        <p className="text-gray-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
          Vous êtes maintenant membre de <strong className="text-gray-700 dark:text-slate-200">Baladiya Digital</strong>. Votre compte est activé et vous pouvez maintenant vous connecter.
        </p>
        <button
          onClick={onLogin}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 text-base"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
};
