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
import { CheckCircle, Mail, XCircle, FileImage, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface VoirieCitizenShape {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  nin?: string;
  adresse?: string;
  address?: string;
  wilaya?: string;
  commune?: string;
  dateNaissance?: string;
  /** Proof of domicile (photo/image) */
  cniFileUrl?: string;
  factureFileUrl?: string;
  /** Written request document (PDF or image) */
  writtenRequestUrl?: string;
  photo_cni_path?: string;
  photo_domicile_path?: string;
}

interface AutorisationVoirieTraitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandes: VoirieCitizenShape | null;
  language: 'fr' | 'en';
  onValidate: (action?: 'completed' | 'rejected') => void;
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
  citizen: VoirieCitizenShape;
  language: 'fr' | 'en';
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  sending: boolean;
}) {
  const fr = language === 'fr';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 divide-y divide-slate-200 dark:divide-slate-600">
        {[
          { label: fr ? 'Nom complet' : 'Full name', value: `${citizen.firstName ?? ''} ${citizen.lastName ?? ''}`.trim() },
          { label: 'Email', value: citizen.email },
          { label: 'NIN', value: citizen.nin },
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
export function AutorisationVoirieTraitmentDialog({
  open, onOpenChange, demandes, language, onValidate, onCancel,
}: AutorisationVoirieTraitmentDialogProps) {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [sending, setSending] = useState(false);

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Autorisation de voirie',
    subtitle: 'Vérifiez les informations du dossier avant de poursuivre.',
    validate: 'Continuer',
    cancel: 'Annuler',
    firstName: 'Prénom',
    lastName: 'Nom',
    nin: 'NIN',
    proofDomicile: 'Justificatif de domicile',
    proofRequest: 'Demande écrite (PDF)',
    noFile: 'Aucun fichier',
    viewFullscreen: 'Voir en plein écran',
    reviewTitle: 'Confirmation de la demande',
    reviewSubtitle: "Approuvez ou rejetez la demande du citoyen.",
    emailSent: 'Email envoyé avec succès au citoyen !',
  } : {
    title: 'Processing — Road Authorization',
    subtitle: 'Review the file information before continuing.',
    validate: 'Continue',
    cancel: 'Cancel',
    firstName: 'First name',
    lastName: 'Last name',
    nin: 'NIN',
    proofDomicile: 'Proof of Domicile',
    proofRequest: 'Written Request (PDF)',
    noFile: 'No file',
    viewFullscreen: 'View full screen',
    reviewTitle: 'Request Confirmation',
    reviewSubtitle: "Approve or reject the citizen's request.",
    emailSent: 'Email sent successfully to the citizen!',
  }, [language]);

  useEffect(() => {
    if (!open) return;
    setStep('form');
  }, [open]);

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
          requestSubject: language === 'fr' ? 'Autorisation de voirie' : 'Road Authorization',
          employeeName: language === 'fr' ? 'Service Technique' : 'Technical Service',
          requestId: demandes?.id,
          citizen_id: demandes?.id,
          wilaya: demandes?.wilaya,
          commune: demandes?.commune,
          adresse: demandes?.adresse || demandes?.address,
          dateNaissance: demandes?.dateNaissance,
          citizenNin: demandes?.nin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      onValidate('completed');
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

  const handleReject = async () => {
    if (!demandes?.email) {
      toast.error(language === 'fr' ? 'Aucun email disponible' : 'No email available');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/email/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          citizenEmail: demandes?.email,
          citizenFirstName: demandes?.firstName,
          citizenLastName: demandes?.lastName,
          requestSubject: language === 'fr' ? 'Autorisation de voirie' : 'Road Authorization',
          employeeName: language === 'fr' ? 'Service Technique' : 'Technical Service',
          requestId: demandes?.id,
          citizenNin: demandes?.nin,
          comment: language === 'fr'
            ? 'Votre demande a été rejetée. Veuillez réessayer.'
            : 'Your request has been rejected, please try again.',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send rejection email');
      }

      onValidate('rejected');
      onOpenChange(false);
      toast.error(
        language === 'fr' ? 'Demande rejetée' : 'Request rejected',
        { duration: 3000 }
      );
    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error(language === 'fr' ? `Erreur: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="grid grid-cols-[minmax(160px,35%)_1fr] gap-3 items-center border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );

  const FileRow = ({ label, url, isPdf }: { label: string; url?: string; isPdf?: boolean }) => (
    <div className="grid grid-cols-[minmax(160px,35%)_1fr] gap-3 items-start border-b border-slate-200 dark:border-slate-600 py-3 last:border-b-0">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0 mt-1">{label}</Label>
      <div className="min-w-0">
        {url ? (
          <div className="flex flex-col gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              {isPdf
                ? <FileText className="w-4 h-4" />
                : <FileImage className="w-4 h-4" />}
              {tr.viewFullscreen}
            </a>
            {!isPdf && (
              <img
                src={url}
                alt={label}
                className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-sm italic">{tr.noFile}</span>
        )}
      </div>
    </div>
  );

  // Resolve the two document URLs from whichever field is available
  const domicileUrl = demandes?.photo_domicile_path || demandes?.factureFileUrl || demandes?.cniFileUrl;
  const writtenRequestUrl = demandes?.writtenRequestUrl || demandes?.photo_cni_path;

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
              {/* Document 1: Proof of domicile */}
              <FileRow
                label={tr.proofDomicile}
                url={domicileUrl}
                isPdf={false}
              />
              {/* Document 2: Written request (PDF) */}
              <FileRow
                label={tr.proofRequest}
                url={writtenRequestUrl}
                isPdf={writtenRequestUrl?.toLowerCase().endsWith('.pdf')}
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
              citizen={demandes}
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
