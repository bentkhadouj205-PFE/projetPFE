import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL, BACKEND_URL } from '@/lib/apiBase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, }
  from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, }
  from '@/components/ui/select';
import { WILAYA_NAMES, communesForWilaya } from '@/data/wilayasCommunes';
import { CheckCircle, Mail, ArrowLeft, XCircle, Loader2 } from 'lucide-react';

export interface BirthActCitizenShape {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  nin?: string;
  wilaya?: string;
  commune?: string;
  actYear?: string;
  actNumber?: string;
  cniFileUrl?: string | null;
  selfiePath?: string | null;
}
interface BirthActTraitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citizen: BirthActCitizenShape | null;
  language: 'fr' | 'en';
  onValidate: () => void;
  onCancel: () => void;
}
function ensureWilayaOption(wilaya: string, list: string[]): string[] {
  const w = wilaya.trim();
  if (!w) return list;
  if (list.some((x) => x.toLowerCase() === w.toLowerCase())) return list;
  return [w, ...list].sort((a, b) => a.localeCompare(b, 'fr'));
}

function ensureCommuneOption(commune: string, list: string[]): string[] {
  const c = commune.trim();
  if (!c) return list;
  if (list.some((x) => x.toLowerCase() === c.toLowerCase())) return list;
  return [c, ...list].sort((a, b) => a.localeCompare(b, 'fr'));
}

// ─── Step 2: Demande d'Acte de Naissance ─────────────────────────────────────
function DemandePreview({
  citizen, wilaya, commune, actYear, actNumber,
  language, onSendEmail, onBack, sending,
}: {
  citizen: BirthActCitizenShape;
  wilaya: string; commune: string; actYear: string; actNumber: string;
  language: 'fr' | 'en';
  onSendEmail: () => void; onBack: () => void;
  sending: boolean;
}) {
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-sm font-semibold text-slate-600">{label}:</label>
      <div className="border border-blue-300 rounded px-3 py-2 bg-blue-50 text-slate-800 text-sm">
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Personal Information Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-center font-semibold text-slate-700 mb-3 text-sm">
          {language === 'fr' ? 'Informations de la Demande' : 'Request Information'}
        </p>
        <div className="space-y-2 text-sm">
          {[
            { label: language === 'fr' ? 'Prénom' : 'First Name', value: citizen.firstName },
            { label: language === 'fr' ? 'Nom' : 'Last Name', value: citizen.lastName },
            { label: 'Email', value: citizen.email },
            { label: 'NIN', value: citizen.nin },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1 last:border-0">
              <span className="text-slate-500">{label}:</span>
              <span className={`font-medium ${label === 'Email' ? 'text-blue-600' : 'text-slate-800'} ${label === 'NIN' ? 'font-mono' : ''}`}>
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Acte Information — Blue Card */}
      <div className="rounded-lg border border-blue-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5">
          <p className="text-center font-semibold text-white text-sm">
            {language === 'fr' ? "Informations de l'Acte" : 'Act Information'}
          </p>
        </div>
        <div className="bg-blue-50 p-4 space-y-2 text-sm">
          {[
            { label: 'Wilaya', value: wilaya },
            { label: language === 'fr' ? 'Commune' : 'Municipality', value: commune },
            { label: language === 'fr' ? "Année de l'acte" : 'Year of act', value: actYear },
            { label: language === 'fr' ? "N° de l'acte" : 'Act Number', value: actNumber },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between border-b border-blue-100 pb-1.5 last:border-0">
              <span className="text-blue-600 font-medium">{label}:</span>
              <span className="font-semibold text-blue-900">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={sending} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>

        <Button type="button" onClick={onSendEmail} disabled={sending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {language === 'fr' ? 'Approuver et Envoyer' : 'Approve & Send'}
        </Button>
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export function BirthActTraitmentDialog({
  open, onOpenChange, citizen, language, onValidate, onCancel,
}: BirthActTraitmentDialogProps) {
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [actYear, setActYear] = useState('');
  const [actNumber, setActNumber] = useState('');

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Certificat de Naissance',
    wilaya: 'Wilaya', commune: 'Commune', actYear: "Année de l'acte",
    actNumber: "N° de l'acte", position: 'Position', copies: 'Nbre de Copies',
    firstName: 'Prénom', lastName: 'Nom', validate: 'Valider', cancel: 'Annuler', select: 'Sélectionner',
  } : {
    title: 'Processing — Birth Certificate',
    wilaya: 'Wilaya', commune: 'Municipality', actYear: 'Year of act',
    actNumber: 'Act number', position: 'Position', copies: 'Number of copies',
    firstName: 'First name', lastName: 'Last name', validate: 'Confirm', cancel: 'Cancel', select: 'Select',
  }, [language]);

  useEffect(() => {
    if (!open || !citizen) return;
    setWilaya(citizen.wilaya?.trim() || '');
    setCommune(citizen.commune?.trim() || '');
    setActYear(citizen.actYear?.trim() || '');
    setActNumber(citizen.actNumber?.trim() || '');
  }, [open, citizen]);

  const wilayaOptions = useMemo(() => ensureWilayaOption(wilaya, [...WILAYA_NAMES]), [wilaya]);
  const communeOptions = useMemo(() => {
    const base = wilaya ? communesForWilaya(wilaya) : [];
    return ensureCommuneOption(commune, base);
  }, [wilaya, commune]);

  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!citizen?.email) {
      toast.error(language === 'fr' ? 'Aucun email disponible' : 'No email available');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/email/generate-and-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          citizenEmail: citizen?.email,
          citizenFirstName: citizen?.firstName,
          citizenLastName: citizen?.lastName,
          requestSubject: tr.title,
          employeeName: 'Service État Civil',
          requestId: citizen?.id,
          citizen_id: citizen?.id,
          wilaya: citizen?.wilaya,
          commune: citizen?.commune,
          actYear: citizen?.actYear,
          actNumber: citizen?.actNumber,
          acteId: citizen?.id,
          citizenNin: citizen?.nin,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');

      toast.success(
        language === 'fr'
          ? ` Email envoyé avec succès à ${citizen?.email}`
          : ` Email sent successfully to ${citizen?.email}`
      );

      onOpenChange(false);
      onValidate();

    } catch (err: any) {
      console.error(err);
      toast.error(` ${err.message}`);
    } finally {
      setSending(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        {citizen && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{tr.title}</DialogTitle>
            </DialogHeader>
            <DemandePreview
              citizen={citizen}
              wilaya={wilaya}
              commune={commune}
              actYear={actYear}
              actNumber={actNumber}
              language={language}
              onSendEmail={handleSendEmail}
              onBack={() => onOpenChange(false)}
              sending={sending}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}