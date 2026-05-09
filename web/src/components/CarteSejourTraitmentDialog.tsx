import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/apiBase';
import { CheckCircle, Mail, XCircle, FileImage, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface CarteSejourCitizenShape {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  nin?: string;
  cni?: string;
  cniFileUrl?: string;
  factureFileUrl?: string;
  dateNaissance?: string;
  adresse?: string;
  address?: string;
  wilaya?: string;
  commune?: string;
}

interface CarteSejourTraitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandes: CarteSejourCitizenShape | null;
  language: 'fr' | 'en';
  onValidate: () => void;
  onCancel: () => void;
}

// ─── Step 2: Approve / Reject ─────────────────────────────────────────────────
function ReviewStep({
  citizen,
  language,
  onApprove,
  onReject,
  onBack,
  sending,
}: {
  citizen: CarteSejourCitizenShape;
  language: 'fr' | 'en';
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  sending: boolean;
}) {
  const fr = language === 'fr';

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 divide-y divide-slate-200 dark:divide-slate-600">
        {[
          { label: fr ? 'Nom complet' : 'Full name', value: `${citizen.firstName ?? ''} ${citizen.lastName ?? ''}`.trim() },
          { label: 'Email', value: citizen.email },
          { label: 'NIN', value: citizen.nin },
          { label: fr ? 'Date de naissance' : 'Date of birth', value: citizen.dateNaissance },
          { label: fr ? 'Adresse' : 'Address', value: citizen.adresse },
          { label: 'Wilaya', value: citizen.wilaya },
        ].map(({ label, value }) =>
          value ? (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right max-w-[55%]">{value}</span>
            </div>
          ) : null
        )}
      </div>

      {/* Email notice */}
      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300">
        <Mail className="w-4 h-4 text-blue-500 shrink-0" />
        {fr
          ? 'Un email de confirmation sera envoyé automatiquement au citoyen.'
          : 'A confirmation email will be sent automatically to the citizen.'}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={sending} className="w-24">
          {fr ? 'Retour' : 'Back'}
        </Button>
        <Button
          type="button"
          onClick={onReject}
          disabled={sending}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          {fr ? 'Rejeter' : 'Reject'}
        </Button>
        <Button
          type="button"
          onClick={onApprove}
          disabled={sending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {fr ? 'Approuver' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CarteSejourTraitmentDialog({
  open, onOpenChange, demandes, language, onValidate, onCancel,
}: CarteSejourTraitmentDialogProps) {
  const [adresse, setAdresse] = useState('');
  const [step, setStep] = useState<'form' | 'review'>('form');

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Fiche de Résidence',
    subtitle: 'Vérifiez les informations du dossier avant de poursuivre.',
    adresse: 'Adresse ',
    validate: 'Valider',
    cancel: 'Annuler',
    firstName: 'Prénom',
    lastName: 'Nom',
    nin: 'NIN',
    reviewTitle: 'Confirmation de la demande',
    reviewSubtitle: 'Approuvez ou rejetez la demande du citoyen.',
    emailSent: 'Email envoyé avec succès au citoyen !',
  } : {
    title: 'Processing — Residence Card',
    subtitle: 'Review the file information before continuing.',
    adresse: 'Address ',
    validate: 'Confirm',
    cancel: 'Cancel',
    firstName: 'First name',
    lastName: 'Last name',
    nin: 'NIN',
    reviewTitle: 'Request Confirmation',
    reviewSubtitle: "Approve or reject the citizen's request.",
    emailSent: 'Email sent successfully to the citizen!',
  }, [language]);

  useEffect(() => {
    if (!open || !demandes) return;
    setAdresse(demandes.adresse?.trim() || demandes.address?.trim() || '');
    setStep('form');
  }, [open, demandes]);

  const [sending, setSending] = useState(false);

  const handleApprove = async () => {
    if (!demandes?.email) {
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
          citizenEmail: demandes?.email,
          citizenFirstName: demandes?.firstName,
          citizenLastName: demandes?.lastName,
          requestSubject: 'Fiche de Résidence',
          employeeName: 'Service État Civil',
          requestId: demandes?.id,
          citizen_id: demandes?.id, // Added for backend compatibility
          wilaya: demandes?.wilaya,
          commune: demandes?.commune,
          adresse: adresse,
          dateNaissance: demandes?.dateNaissance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      onValidate();
      onOpenChange(false);
      toast.success(tr.emailSent, {
        icon: <Mail className="w-4 h-4 text-green-600" />,
        duration: 4000,
        description: demandes?.email
          ? `${language === 'fr' ? 'Destinataire' : 'Recipient'}: ${demandes.email}`
          : undefined,
      });
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(language === 'fr' ? `Erreur: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleReject = () => {
    onOpenChange(false);
    toast.error(
      language === 'fr' ? 'Demande rejetée' : 'Request rejected',
      { duration: 3000 }
    );
  };

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="grid grid-cols-[minmax(140px,32%)_1fr] gap-3 items-center border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );

  const FileRow = ({ label, url }: { label: string; url?: string }) => (
    <div className="grid grid-cols-[minmax(140px,32%)_1fr] gap-3 items-center border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</Label>
      <div className="min-w-0">
        {url ? (
          <div className="flex flex-col gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline text-sm mb-1">
              <FileImage className="w-4 h-4" />
              {language === 'fr' ? 'Voir en plein écran' : 'View full screen'}
            </a>
            <img
              src={url}
              alt={label}
              className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <span className="text-slate-400 text-sm">{language === 'fr' ? 'Aucun fichier' : 'No file'}</span>
        )}
      </div>
    </div>
  );

  const citizenWithAdresse: CarteSejourCitizenShape = { ...demandes, adresse };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">

        {/* ── Step 1: Verification Form ── */}
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{tr.title}</DialogTitle>
              <DialogDescription>{tr.subtitle}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 bg-slate-50/50 dark:bg-slate-800/40">
              <Row label={tr.firstName}>
                <Input readOnly value={demandes?.firstName ?? ''} className="bg-white dark:bg-slate-900" />
              </Row>
              <Row label={tr.lastName}>
                <Input readOnly value={demandes?.lastName ?? ''} className="bg-white dark:bg-slate-900" />
              </Row>
              <Row label={tr.nin}>
                <Input readOnly value={demandes?.nin ?? ''} className="bg-white dark:bg-slate-900 font-mono" />
              </Row>
              <Row label={tr.adresse}>
                <Input
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="—"
                  className="bg-white dark:bg-slate-900"
                />
              </Row>
              <FileRow
                label={language === 'fr' ? 'Justificatif (Photo)' : 'Proof of Residence (Photo)'}
                url={demandes?.factureFileUrl}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { onCancel(); onOpenChange(false); }}>
                {tr.cancel}
              </Button>
              <Button type="button" onClick={() => setStep('review')} className="bg-blue-600 hover:bg-blue-700">
                {tr.validate}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: Approve / Reject ── */}
        {step === 'review' && demandes && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{tr.reviewTitle}</DialogTitle>
              <DialogDescription>{tr.reviewSubtitle}</DialogDescription>
            </DialogHeader>
            <ReviewStep
              citizen={citizenWithAdresse}
              language={language}
              onApprove={handleApprove}
              onReject={handleReject}
              onBack={() => setStep('form')}
              sending={sending}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}