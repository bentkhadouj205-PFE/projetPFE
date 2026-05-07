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
      {/* Unified Information Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <p className="text-center font-semibold text-slate-700 mb-3 text-sm">
            {language === 'fr' ? 'Informations de la Demande' : 'Request Information'}
          </p>
          <div className="space-y-2 text-sm">
            {[
              { label: 'First Name', value: citizen.firstName },
              { label: 'Last Name', value: citizen.lastName },
              { label: 'Email', value: citizen.email },
              { label: 'NIN', value: citizen.nin },
              { label: 'Wilaya', value: wilaya },
              { label: 'Commune / Municipality', value: commune },
              { label: "Année de l'acte / Year", value: actYear },
              { label: "N° de l'acte / Act Number", value: actNumber },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-slate-100 pb-1 last:border-0">
                <span className="text-slate-500">{label}:</span>
                <span className={`font-medium ${label === 'Email' ? 'text-blue-600' : 'text-slate-800'} font-${label === 'NIN' ? 'mono' : 'normal'}`}>
                  {value || '—'}
                </span>
              </div>
            ))}
          </div>
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
  const [position, setPosition] = useState('');
  const [copiesCount, setCopiesCount] = useState('1');
  const [step, setStep] = useState<'form' | 'demande' | 'certificate'>('form');

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Acte de naissance',
    wilaya: 'Wilaya', commune: 'Commune', actYear: "Année de l'acte",
    actNumber: "N° de l'acte", position: 'Position', copies: 'Nbre de Copies',
    firstName: 'Prénom', lastName: 'Nom', validate: 'Valider', cancel: 'Annuler', select: 'Sélectionner',
  } : {
    title: 'Processing — Birth certificate',
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
    setPosition('');
    setCopiesCount('1');
    setStep('demande');
  }, [open, citizen]);

  const wilayaOptions = useMemo(() => ensureWilayaOption(wilaya, [...WILAYA_NAMES]), [wilaya]);
  const communeOptions = useMemo(() => {
    const base = wilaya ? communesForWilaya(wilaya) : [];
    return ensureCommuneOption(commune, base);
  }, [wilaya, commune]);

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="grid grid-cols-[minmax(140px,32%)_1fr] gap-3 items-center border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );

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

        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{tr.title}</DialogTitle>
            </DialogHeader>
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 bg-slate-50/50 dark:bg-slate-800/40">
              <Row label={tr.firstName}>
                <Input readOnly value={citizen?.firstName ?? ''} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.lastName}>
                <Input readOnly value={citizen?.lastName ?? ''} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.wilaya}>
                <Select value={wilaya || undefined} onValueChange={(v) => { setWilaya(v); setCommune(''); }}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {wilayaOptions.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={tr.commune}>
                <Select value={commune || undefined} onValueChange={setCommune} disabled={communeOptions.length === 0}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                  <SelectContent>
                    {communeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={tr.actYear}>
                <Input value={actYear} onChange={(e) => setActYear(e.target.value)} placeholder="—"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
              </Row>
              <Row label={tr.actNumber}>
                <Input value={actNumber} onChange={(e) => setActNumber(e.target.value)} placeholder="—"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 font-mono" />
              </Row>
              <Row label={tr.position}>
                <Select value={position || undefined} onValueChange={setPosition}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-full">
                    <SelectValue placeholder={tr.select} />
                  </SelectTrigger>
                </Select>
              </Row>
              <Row label={tr.copies}>
                <Input type="number" min={1} max={99} value={copiesCount}
                  onChange={(e) => setCopiesCount(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 w-24" />
              </Row>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { onCancel(); onOpenChange(false); }}>
                {tr.cancel}
              </Button>
              <Button type="button" onClick={() => { setStep('demande'); onValidate(); }} className="bg-blue-600 hover:bg-blue-700">
                {tr.validate}
              </Button>
            </div>
          </>
        )}

        {step === 'demande' && citizen && (
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
              onBack={() => setStep('form')}
              sending={sending}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}