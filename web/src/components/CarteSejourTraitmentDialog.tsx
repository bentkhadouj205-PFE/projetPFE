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
import { CheckCircle, Mail, ArrowLeft, XCircle, FileImage } from 'lucide-react';
import { toast } from 'sonner';

export interface CarteSejourCitizenShape {
  firstName?: string;
  lastName?: string;
  email?: string;
  nin?: string;
  cni?: string;
  cniFileUrl?: string;
  factureFileUrl?: string;
  dateNaissance?: string;
  adresse?: string;
  wilaya?: string;
  commune?: string;
}

interface CarteSejourTraitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citizen: CarteSejourCitizenShape | null;
  language: 'fr' | 'en';
  onValidate: () => void;
  onCancel: () => void;
}

// ─── Step 2: Demande de Fiche de Résidence ──────────────────────────────────────
function DemandePreview({
  citizen, language, onApprove, onReject, onBack,
}: {
  citizen: CarteSejourCitizenShape;
  language: 'fr' | 'en';
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
}) {
  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-sm font-semibold text-slate-600">{label}:</label>
      <div className="border border-blue-300 rounded px-3 py-2 bg-blue-50 text-slate-800 text-sm">
        {value || '—'}
      </div>
    </div>
  );

  const FilePreview = ({ label, url }: { label: string; url?: string }) => (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-sm font-semibold text-slate-600">{label}:</label>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 border border-blue-300 rounded px-3 py-2 bg-blue-50 text-blue-600 text-sm hover:bg-blue-100 transition-colors">
          <FileImage className="w-4 h-4" />
          {language === 'fr' ? 'Voir le fichier' : 'View file'}
        </a>
      ) : (
        <div className="border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-400 text-sm">
          {language === 'fr' ? 'Aucun fichier' : 'No file'}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-slate-700 text-white rounded-lg p-4 text-center">
        <h3 className="font-bold text-base">Demande de Fiche de Résidence</h3>
        <p className="text-slate-300 text-xs mt-1">Residence Card Request</p>
      </div>

      {/* Fields */}
      <div className="px-1">
        <Field label={language === 'fr' ? 'Nom' : 'Last Name'} value={citizen.lastName} />
        <Field label={language === 'fr' ? 'Prénom' : 'First Name'} value={citizen.firstName} />
        <Field label="Email" value={citizen.email} />
        <Field label="NIN" value={citizen.nin} />
        <Field label={language === 'fr' ? 'Adresse / سكن' : 'Address / سكن'} value={citizen.adresse} />
        <Field label={language === 'fr' ? 'Wilaya' : 'Wilaya'} value={citizen.wilaya} />
        <FilePreview label={language === 'fr' ? 'Justificatif (Photo)' : 'Proof of Residence (Photo)'} url={citizen.factureFileUrl} />
      </div>



      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onReject}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1">
          <XCircle className="w-4 h-4" /> ✕ REJECT
        </Button>
        <Button type="button" onClick={onApprove}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1">
          <CheckCircle className="w-4 h-4" /> ✓ APPROVE
        </Button>
      </div>
    </div>
  );
}
function CarteSejourPreview({
  citizen, language, onSendEmail, onBack,
}: {
  citizen: CarteSejourCitizenShape;
  language: 'fr' | 'en';
  onSendEmail: () => void;
  onBack: () => void;
}) {
  const today = new Date().toLocaleDateString('fr-FR');

  return (
    <div className="flex flex-col gap-4">
      {/* Arabic Certificate */}
      <div dir="rtl" className="border border-slate-300 rounded-lg p-5 bg-white text-right"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '2' }}>

        {/* Header */}
        <div className="text-right mb-2 text-xs">
          <p className="font-bold">الجمهورية الجزائرية الديموقراطية الشعبية</p>
          <p>وزارة الداخلية</p>
        </div>

        {/* Wilaya / Daira / Baladiya */}
        <div className="text-xs mb-2 space-y-0.5 text-right">
          <p>ولاية <span className="font-bold">{citizen.wilaya || 'مستقانم'}</span></p>
          <p>دائرة <span className="font-bold">{citizen.commune || 'مستقانم'}</span></p>
          <p>بلدية <span className="font-bold">{citizen.commune || 'مستقانم'}</span></p>
        </div>

        {/* Title */}
        <div className="text-center my-4">
          <div className="border-2 border-slate-800 inline-block px-6 py-1">
            <h2 className="text-xl font-bold">بطاقة اقامة</h2>
          </div>
        </div>

        {/* Body */}
        <div className="text-xs space-y-3 mt-4">
          <p>
            نَحْنُ <span className="border-b border-dotted border-slate-400 inline-block w-32">............</span>
            &nbsp;ولد عابد مشري
          </p>
          <p>
            رئيسُ المَجْلِس الشَّعْبِيّ البَلَدِيّ لِبَلَدِيَّةِ: <span className="font-bold">{citizen.commune || 'مستقانم'}</span>
          </p>

          <div className="text-center my-3">
            <p className="font-bold text-sm">نَشْهَدُ بأَنَّ:</p>
          </div>

          <p>
            السيد(ة) <span className="font-bold">{citizen.firstName} {citizen.lastName}</span>
            <span className="border-b border-dotted border-slate-400 inline-block w-20 mr-2">........</span>
          </p>
          <p>
            المولود ب <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;بتاريخ <span className="font-bold">{citizen.dateNaissance || '..../.../...'}</span>
          </p>
          <p>
            الجنسية <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
            &nbsp;المهنة <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
          </p>
          <p>
            السكن <span className="font-bold">{citizen.adresse || '............'}</span>
          </p>
          <p className="text-xs">
            يقيم بنفس العنوان مُنذُ أكْثَر من سِتَّةِ (6) أَشْهُر
          </p>
          <p className="text-xs">
            وَقَدْ سَلَّمَتْ لَهُ هَذِهِ الشَّهادَةُ لإِدْلاء بِها فِي حُدُودِ ما يَسْمَحُ بِهِ القَانُونُ
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs">
          <p className="font-bold">حرر ب <span>{citizen.commune || 'مستغانم'}</span> بتاريخ {today}</p>
          <p>وَالْغَرَضُ مِنْ مَنْح هَذِهِ الشَّهَادَةُ هُوَ إِثْباتُ السُّكْنِ</p>
        </div>

        <div className="mt-3 text-xs border-t pt-2">
          <p className="font-bold">(1) إِنَّ صَلاحِيَّةَ الْعَمَل بِهَذِهِ الشَّهَادَةِ لا يُمْكِنُ أَنْ تَتَجَاوَز سِتَّةَ (6) أَشْهُر</p>
          <p className="mt-1">الكتابة السابقة للاسم والقب</p>
          <p className="border-b border-dotted border-slate-400 inline-block w-48 mt-1">&nbsp;</p>
        </div>
      </div>

      {/* Citizen info */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm border border-slate-200 dark:border-slate-600">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {language === 'fr' ? 'Citoyen' : 'Citizen'}:
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          {citizen.firstName} {citizen.lastName} — <span className="text-blue-600">{citizen.email}</span>
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onSendEmail}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          {language === 'fr' ? 'Envoyer par Email' : 'Send by Email'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CarteSejourTraitmentDialog({
  open, onOpenChange, citizen, language, onValidate, onCancel,
}: CarteSejourTraitmentDialogProps) {
  const [adresse, setAdresse] = useState('');
  const [step, setStep] = useState<'form' | 'demande' | 'certificate'>('form');

  const tr = useMemo(() => language === 'fr' ? {
    title: 'Traitement — Fiche de Résidence',
    subtitle: 'Vérifiez les informations du dossier avant de poursuivre.',
    certTitle: 'Fiche de Résidence — بطاقة الإقامة',
    certSubtitle: 'Vérifiez le document avant envoi.',
    adresse: 'Adresse / سكن',
    validate: 'Valider',
    cancel: 'Annuler',
    firstName: 'Prénom',
    lastName: 'Nom',
    nin: 'NIN',
    cni: 'CNI',
    dateNaissance: 'Date de naissance',
    email: 'Email',
  } : {
    title: 'Processing — Residence Card',
    subtitle: 'Review the file information before continuing.',
    certTitle: 'Residence Card — بطاقة الإقامة',
    certSubtitle: 'Review the document before sending.',
    adresse: 'Address / سكن',
    validate: 'Confirm',
    cancel: 'Cancel',
    firstName: 'First name',
    lastName: 'Last name',
    nin: 'NIN',
    cni: 'CNI',
    dateNaissance: 'Date of birth',
    email: 'Email',
  }, [language]);

  useEffect(() => {
    if (!open || !citizen) return;
    setAdresse(citizen.adresse?.trim() || '');
    setStep('form');
  }, [open, citizen]);

  const handleSendEmail = () => {
    const email = citizen?.email || '';
    const subject = encodeURIComponent('بطاقة الإقامة - Fiche de Résidence');
    const body = encodeURIComponent(
      `Bonjour ${citizen?.firstName || ''} ${citizen?.lastName || ''},\n\nVeuillez trouver ci-joint votre Fiche de Résidence.\n\nCordialement,\nService d'état civil`
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`,
      '_blank'
    );
    toast.success(language === 'fr' ? 'Email envoyé avec succès' : 'Email sent successfully');
    onOpenChange(false);
    onValidate();
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
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
            <FileImage className="w-4 h-4" />
            {language === 'fr' ? 'Voir le fichier' : 'View file'}
          </a>
        ) : (
          <span className="text-slate-400 text-sm">{language === 'fr' ? 'Aucun fichier' : 'No file'}</span>
        )}
      </div>
    </div>
  );

  const citizenWithAdresse = { ...citizen, adresse };

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
                <Input readOnly value={demendes?.firstName ?? ''} className="bg-white dark:bg-slate-900" />
              </Row>
              <Row label={tr.lastName}>
                <Input readOnly value={demendes?.lastName ?? ''} className="bg-white dark:bg-slate-900" />
              </Row>
              <Row label={tr.nin}>
                <Input readOnly value={demendes?.nin ?? ''} className="bg-white dark:bg-slate-900 font-mono" />
              </Row>
              <Row label={tr.adresse}>
                <Input
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="—"
                  className="bg-white dark:bg-slate-900"
                />
              </Row>
              <FileRow label={language === 'fr' ? 'Justificatif (Photo)' : 'Proof of Residence (Photo)'} url={citizen?.factureFileUrl} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { onCancel(); onOpenChange(false); }}>
                {tr.cancel}
              </Button>
              <Button type="button" onClick={() => setStep('demande')}
                className="bg-blue-600 hover:bg-blue-700">
                {tr.validate}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: Demande Preview ── */}
        {step === 'demande' && citizen && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{tr.title}</DialogTitle>
              <DialogDescription>{tr.subtitle}</DialogDescription>
            </DialogHeader>
            <DemandePreview
              citizen={citizenWithAdresse}
              language={language}
              onApprove={() => setStep('certificate')}
              onReject={() => onOpenChange(false)}
              onBack={() => setStep('form')}
            />
          </>
        )}
        {step === 'certificate' && citizen && (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {tr.certTitle}
              </DialogTitle>
              <DialogDescription>{tr.certSubtitle}</DialogDescription>
            </DialogHeader>
            <CarteSejourPreview
              citizen={citizenWithAdresse}
              language={language}
              onSendEmail={handleSendEmail}
              onBack={() => setStep('demande')}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}