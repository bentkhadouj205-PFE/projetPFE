import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Mail, User, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiBase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Citizen {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  nin: string;
  wilaya?: string;
  commune?: string;
  photo_selfie_url?: string;
}

interface VerificationResponse {
  citizen: Citizen;
  isValid: boolean;
  mismatches: string[];
  actions: ('VALIDATE' | 'REJECT')[];
}

export const VerificationDashboard: React.FC<{ citizenId: string }> = ({ citizenId }) => {
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchVerificationData();
  }, [citizenId]);

  const fetchVerificationData = async () => {
    try {
      const response = await axios.get<VerificationResponse>(`${API_BASE_URL}/verify/${citizenId}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch verification data');
      toast.error('Impossible de charger les données de vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/validate`, { citizenId });
      toast.success('Email d\'activation envoyé avec succès !');
    } catch (error: any) {
      toast.error('Erreur lors de l\'envoi de l\'email : ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement de la vérification...</div>;
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">Erreur : Données introuvables</div>;

  const { citizen, verification, actions, mismatches } = data as any;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Panneau de Vérification d'Identité</h3>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Données Soumises</h4>

            <div className={`p-4 rounded-lg border flex items-center justify-between ${mismatches.includes('firstName') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <div>
                <p className="text-xs font-medium opacity-70 uppercase">Prénom</p>
                <p className="font-bold">{citizen.prenom}</p>
              </div>
              {mismatches.includes('firstName') ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>

            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 uppercase">Nom de Famille</p>
              <p className="font-bold text-slate-900 dark:text-white">{citizen.nom}</p>
            </div>

            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 uppercase">NIN (Identification)</p>
              <p className="font-bold text-slate-900 dark:text-white">{citizen.nin}</p>
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Vérification Visuelle</h4>
            <div className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {citizen.photo_selfie_url ? (
                <img src={citizen.photo_selfie_url} alt="Selfie" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Aucune photo selfie disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="pt-6 border-top border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-3">
            {actions.includes('VALIDATE') && (
              <Button
                onClick={handleValidate}
                disabled={actionLoading}
                className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Mail className="w-6 h-6" />
                )}
                {actionLoading ? 'Envoi en cours...' : 'Valider et Envoyer l\'Email d\'Activation'}
              </Button>
            )}

            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
              Rejeter la demande
            </Button>
          </div>

          <div className={`mt-6 p-4 rounded-lg text-center font-medium ${data.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {data.isValid
              ? ' Toutes les informations correspondent au registre officiel'
              : ' Attention : Certaines informations ne correspondent pas'}
          </div>
        </div>
      </div>
    </div>
  );
};
