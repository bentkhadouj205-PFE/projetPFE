import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL, BACKEND_URL } from '@/lib/apiBase';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WILAYA_NAMES, communesForWilaya } from '@/data/wilayasCommunes';
import { CheckCircle, Mail, ArrowLeft, XCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';


const POSITION_OPTIONS_FR = [
  { value: '', label: '—' },
  { value: 'extrait_sans_filiation', label: 'Extrait sans filiation' },
  { value: 'extrait_avec_filiation', label: 'Extrait avec filiation' },
  { value: 'copie_integrale', label: 'Copie intégrale' },
  { value: 'copie_litterale', label: 'Copie littérale' },
  { value: 'mention_marginal', label: 'Mention marginale' },
];

const generateBirthCertificatePDF = (citizen: BirthActCitizenShape, wilaya: string, commune: string, actYear: string, actNumber: string) => {
  const doc = new jsPDF("p", "mm", "a4");

  let y = 15;

  // Header
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(11);

  doc.text("الجمهورية الجزائرية الديمقراطية الشعبية", 105, y, { align: "center" });
  y += 6;
  doc.text("وزارة الداخلية والجماعات المحلية", 105, y, { align: "center" });
  y += 6;
  doc.text("السجل الوطني للحالة المدنية", 105, y, { align: "center" });

  y += 10;

  // Title
  doc.setFontSize(16);
  doc.text("شهادة الميلاد", 105, y, { align: "center" });

  y += 10;

  doc.setFontSize(11);

  // Enable dotted lines
  doc.setLineDashPattern([1, 1], 0);

  // Line 1
  doc.text("في يوم", 10, y);
  doc.line(30, y, 200, y);

  y += 8;

  // Line 2
  doc.text("ولد(ت) ب", 10, y);
  doc.line(40, y, 200, y);

  y += 8;

  // Wilaya / Commune
  doc.text("ولاية", 10, y);
  doc.text(wilaya || "........", 30, y);

  doc.text("بلدية", 110, y);
  doc.text(commune || "........", 130, y);

  y += 8;

  // Name
  doc.text("المسمى(ة):", 10, y);
  doc.text(`${citizen?.firstName || ''} ${citizen?.lastName || ''}`, 50, y);

  y += 8;

  // Act number
  doc.text("رقم الشهادة:", 10, y);
  doc.text(actNumber || "........", 50, y);

  y += 8;

  // Year
  doc.text("السنة:", 10, y);
  doc.text(actYear || "........", 50, y);

  y += 10;

  // Long dotted paragraph (like your PDF)
  doc.line(10, y, 200, y);
  y += 6;
  doc.line(10, y, 200, y);
  y += 6;
  doc.line(10, y, 200, y);

  // Disable dotted
  doc.setLineDashPattern([], 0);

  // Footer
  y += 10;
  doc.text("مستخرج من السجل الوطني للحالة المدنية", 105, y, { align: "center" });

  return doc;
};



export interface BirthActCitizenShape {
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
  citizen, wilaya, commune, actYear, actNumber, position, copiesCount,
  language, onApprove, onReject, onBack,
}: {
  citizen: BirthActCitizenShape;
  wilaya: string; commune: string; actYear: string; actNumber: string;
  position: string; copiesCount: string; language: 'fr' | 'en';
  onApprove: () => void; onReject: () => void; onBack: () => void;
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
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-slate-700 text-white rounded-lg p-4 text-center">
        <h3 className="font-bold text-base">
          {language === 'fr' ? "Demande d'Acte de Naissance" : 'Birth Certificate Request'}
        </h3>
      </div>

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
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onReject}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1">
          <XCircle className="w-4 h-4" /> REJECT
        </Button>
        <Button type="button" onClick={onApprove}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1">
          <CheckCircle className="w-4 h-4" /> APPROVE
        </Button>
      </div>
    </div>
  );
}

function BirthCertificatePreview({
  citizen, wilaya, commune, actYear, actNumber, language, onSendEmail, onBack, sending
}: {
  citizen: BirthActCitizenShape;
  wilaya: string; commune: string; actYear: string; actNumber: string;
  language: 'fr' | 'en'; onSendEmail: () => void; onBack: () => void;
  sending: boolean;
}) {
  const now = new Date();
  // Format: YYYY/MM/DD (Algerian official format)
  const todayAr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-4">
      <div dir="rtl" id="birth-certificate" className="border border-slate-300 rounded-lg p-5 bg-white text-right"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '2' }}>

        {/* Top Header Row */}
        <div className="flex justify-between items-start mb-1 text-xs">
          {/* Left: National Registry label */}
          <div className="text-right">
            <p>وزارة الداخلية والجماعات المحلية</p>
            <p className="font-bold">السجل الوطني للحالة المدنية</p>
          </div>
          {/* Right: Republic header centered */}
          <div className="text-center flex-1">
            <p className="font-bold text-sm">الجمهورية الجزائرية الديموقراطية الشعبية</p>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center my-3">
          <h2 className="text-xl font-bold">شهادة الميلاد</h2>
          <p className="text-xs text-slate-500">نسخة إلكترونية</p>
        </div>

        {/* Certificate Number and Date row */}
        <div className="flex justify-between text-xs mb-2">
          <span>{actYear || '..../.../...'}</span>
          <span>رقم الشهادة: <span className="font-bold">{actNumber || '..........'}</span></span>
        </div>

        {/* Certificate Body */}
        <div className="text-xs space-y-1.5">
          <p>
            في يوم <span className="border-b border-dotted border-slate-400 inline-block w-28">............</span>
            &nbsp;على الساعة <span className="border-b border-dotted border-slate-400 inline-block w-16">......</span>
          </p>
          <p>
            ولد(ت)ب <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;ولاية <span className="font-bold">{wilaya || '............'}</span>
          </p>
          <p>
            &nbsp;.../.../&nbsp;<span className="font-bold">{actYear || '....'}</span>
            &nbsp;المسمى(ة): <span className="font-bold">{citizen.firstName} {citizen.lastName}</span>
          </p>
          <p>الجنس <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span></p>
          <p>
            ابن(ة) <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
            &nbsp;عمره <span className="border-b border-dotted border-slate-400 inline-block w-12">......</span>
            &nbsp;مهنته <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
          </p>
          <p>
            و <span className="border-b border-dotted border-slate-400 inline-block w-24">............</span>
            &nbsp;عمرها <span className="border-b border-dotted border-slate-400 inline-block w-12">......</span>
            &nbsp;مهنتها <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
          </p>
          <p>
            الساكنين <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;بلدية <span className="font-bold">{commune || '............'}</span>
            &nbsp;ولاية <span className="font-bold">{wilaya || '............'}</span>
          </p>
          <p>
            حرر في <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;على الساعة <span className="border-b border-dotted border-slate-400 inline-block w-16">......</span>
          </p>
          <p>
            يُعلان به السيد(ة) <span className="border-b border-dotted border-slate-400 inline-block w-40">................</span>
          </p>
          <p>
            وبعد التلاوة وقّع معنا نحن <span className="border-b border-dotted border-slate-400 inline-block w-20">........</span>
            &nbsp;ضابط الحالة المدنية بالبلدية
          </p>
          <p>البيانات الهامشية <span className="border-b border-dotted border-slate-400 inline-block w-40">................</span></p>
          {[...Array(3)].map((_, i) => <p key={i} className="border-b border-dotted border-slate-300 w-full">&nbsp;</p>)}
        </div>

        {/* Issue Date — AUTO */}
        <div className="mt-3 text-xs">
          <p>حررت ب <span className="font-bold">{commune || 'مستقانم'}</span> ...في.... <span className="font-bold">{todayAr}</span></p>
        </div>

        {/* Latin Name note */}
        <div className="mt-3 text-xs text-center border-t pt-2">
          <p className="text-red-600 font-bold">الكتابة السابقة للاسم واللقب بالأحرف اللاتينية</p>
          <p className="border-b border-dotted border-slate-400 inline-block w-56 mt-1">&nbsp;</p>
        </div>

        {/* Notes */}
        <div className="mt-2 text-xs space-y-0.5 text-right">
          <p>1- كامل الحروف</p>
          <p>2- اسم وقب الأولاد</p>
        </div>

        {/* Footer */}
        <div className="mt-3 text-center border-t pt-2">
          <p className="font-bold text-xs">مستخرج من السجل الوطني للحالة المدنية</p>
          <p className="text-xs text-slate-500">المرجع: 7</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm border border-slate-200 dark:border-slate-600">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {language === 'fr' ? 'Citoyen' : 'Citizen'}:
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          {citizen.firstName} {citizen.lastName} — <span className="text-blue-600">{citizen.email}</span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {language === 'fr' ? 'Retour' : 'Back'}
        </Button>
        <Button type="button" onClick={onSendEmail} disabled={sending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {language === 'fr' ? 'Envoi...' : 'Sending...'}
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              {language === 'fr' ? 'Envoyer par Email' : 'Send by Email'}
            </>
          )}
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
    subtitle: 'Vérifiez les informations issues du dossier avant de poursuivre.',
    certTitle: 'Acte de Naissance — شهادة الميلاد',
    certSubtitle: 'Vérifiez le document avant envoi.',
    wilaya: 'Wilaya', commune: 'Commune', actYear: "Année de l'acte",
    actNumber: "N° de l'acte", position: 'Position', copies: 'Nbre de Copies',
    firstName: 'Prénom', lastName: 'Nom', validate: 'Valider', cancel: 'Annuler', select: 'Sélectionner',
  } : {
    title: 'Processing — Birth certificate',
    subtitle: 'Review the information from the file before continuing.',
    certTitle: 'Birth Certificate — شهادة الميلاد',
    certSubtitle: 'Review the document before sending.',
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
      alert(language === 'fr' ? 'Aucun email disponible pour ce citoyen' : 'No email available for this citizen');
      return;
    }

    setSending(true);
    try {
      const doc = generateBirthCertificatePDF(
        citizen,
        wilaya,
        commune,
        actYear,
        actNumber
      );

      // Download PDF
      doc.save(`acte-naissance-${citizen.firstName}.pdf`);

      toast.success(
        language === 'fr'
          ? `Document généré avec succès !`
          : `Document generated successfully!`
      );
      
      // Close modal
      onOpenChange(false);
      onValidate();

    } catch (error: any) {
      console.error('Generation error:', error);
      alert(
        language === 'fr'
          ? ` Erreur de génération: ${error.message}`
          : ` Generation error: ${error.message}`
      );
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
              <DialogDescription>{tr.subtitle}</DialogDescription>
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
                  <SelectContent>
                    {POSITION_OPTIONS_FR.filter((o) => o.value !== '').map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
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
            <DialogTitle className="sr-only">{tr.title}</DialogTitle>
            <DialogDescription className="sr-only">{tr.subtitle}</DialogDescription>
            <DemandePreview
              citizen={citizen} wilaya={wilaya} commune={commune}
              actYear={actYear} actNumber={actNumber}
              position={POSITION_OPTIONS_FR.find(o => o.value === position)?.label || position}
              copiesCount={copiesCount} language={language}
              onApprove={handleSendEmail}
              onReject={() => onOpenChange(false)}
              onBack={() => onOpenChange(false)}
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
            <BirthCertificatePreview
              citizen={citizen} wilaya={wilaya} commune={commune}
              actYear={actYear} actNumber={actNumber} language={language}
              onSendEmail={handleSendEmail}
              onBack={() => setStep('demande')}
              sending={sending}
            />
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}