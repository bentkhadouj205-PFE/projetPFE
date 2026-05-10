import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket';
import { API_BASE_URL, BACKEND_URL } from '@/lib/apiBase';
import { toast } from 'sonner';
import type { User, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard, Users, CheckSquare, Settings, LogOut, Plus, Search,
  MoreVertical, Trash2, UserCheck, UserX, Briefcase, Calendar, TrendingUp,
  CheckCircle2, Moon, Sun, XCircle, Eye, ArrowLeft,
  ShieldCheck, ShieldX, MessageSquare, Send, Bell,
  FileText, Clock, Shield, FileCheck, AlertTriangle
} from 'lucide-react';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────
interface RegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
  email: string;
  dob: string;
  commune: string;
  address: string;
  status: 'pending' | 'validated' | 'rejected' | 'en_attente' | 'validee' | 'rejetee' | 'termine' | 'refuse';
  rejectionReason?: string;
  cniScanPath: string | null;
  selfiePath: string | null;
  reg: {
    firstName: string | null;
    lastName: string | null;
    nin: string | null;
    dob: string | null;
    commune: string | null;
  };
}

interface Demande {
  id: string;
  userId: string;
  typeDocument: string;
  firstName: string;
  lastName: string;
  nin: string;
  commune: string;
  dateNaissance: string;
  dateDemande: string;
  status: string;
  rejectionReason?: string;
  photoCniPath?: string;
  photoDomicilePath?: string;
}

const mapStatus = (s: string): RegistrationRequest['status'] => {
  const status = String(s || '').toLowerCase().trim();
  if (['en_attente', 'pending'].includes(status)) return 'en_attente';
  if (['validee', 'valide', 'completed', 'validated', 'termine', 'terminee', 'approved', 'verified'].includes(status)) return 'termine';
  if (['rejetee', 'rejected', 'refuse', 'refused', 'rejete', 'denied'].includes(status)) return 'refuse';
  return 'en_attente';
};

const normalizeRequest = (raw: any): RegistrationRequest => ({
  id: raw?.id != null ? String(raw.id) : '',
  firstName: raw?.firstName ?? raw?.prenom ?? raw?.citizen_first_name ?? raw?.first_name ?? '',
  lastName: raw?.lastName ?? raw?.nom ?? raw?.citizen_last_name ?? raw?.last_name ?? '',
  nin: raw?.nin ?? raw?.citizen_nin ?? '',
  email: raw?.email ?? raw?.citizen_email ?? '',
  dob: raw?.dob ?? raw?.date_naissance ?? raw?.date_of_birth ?? '',
  commune: raw?.commune ?? '',
  address: raw?.address ?? raw?.adresse ?? raw?.citizen_address ?? '',
  status: mapStatus(raw?.status ?? 'pending'),
  rejectionReason: raw?.rejectionReason ?? raw?.rejection_reason ?? raw?.commentaire ?? raw?.comment,
  cniScanPath: raw?.cniScanPath ?? raw?.cni_scan_path ?? raw?.cni_recto_path ?? null,
  selfiePath: raw?.selfiePath ?? raw?.selfie_path ?? raw?.photo_domicile_path ?? null,
  reg: raw?.reg ? {
    firstName: raw.reg.firstName ?? raw.reg.prenom ?? raw.reg.first_name ?? null,
    lastName: raw.reg.lastName ?? raw.reg.nom ?? raw.reg.last_name ?? null,
    nin: raw.reg.nin ?? null,
    dob: raw.reg.dob ?? raw.reg.date_naissance ?? null,
    commune: raw.reg.commune ?? null,
  } : {
    firstName: null,
    lastName: null,
    nin: null,
    dob: null,
    commune: null,
  },
});

interface ChatMessage {
  id: number;
  from: 'citizen' | 'agent';
  text: string;
  time: string;
  read: boolean;
}

interface CitizenChat {
  citizenId: number;
  citizenName: string;
  citizenEmail: string;
  messages: ChatMessage[];
}

interface MunicipalAgentDashboardProps {
  user: User;
  onLogout: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  employees: {
    employees: User[];
    addEmployee: (employee: Omit<User, 'id'>) => User;
    updateEmployee: (id: string, updates: Partial<User>) => void;
    deleteEmployee: (id: string) => void;
    toggleEmployeeStatus: (id: string) => void;
  };
  tasks: {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    completeTask: (id: string) => void;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'civil', name: 'Civil Status', nameFr: 'État Civil', color: 'bg-blue-500',
    documents: [
      { en: 'Birth Certificate', fr: 'Acte de naissance' },
      { en: 'Marriage Certificate', fr: 'Certificat de mariage' },
      { en: 'Residence Form', fr: 'Fiche de résidence' },
      { en: 'Residence Certificate', fr: 'Certificat de résidence' }
    ],
    keywords: ['fiche_residence', 'fiche de residence', 'certificat_residence', 'certificat de residence', 'acte_naissance', 'acte de naissance', 'certificat_mariage', 'certificat de mariage', 'etat civil', 'état civil'],
  },
  {
    id: 'autorisation', name: 'Road Occupancy Permit', nameFr: 'Autorisation de voirie', color: 'bg-green-500',
    documents: [
      { en: 'Road Occupancy Permit', fr: 'Autorisation de voirie' }
    ],
    keywords: ['autorisation de voirie', 'voirie', 'road occupancy'],
  },
];

const SERVICE_LABELS: Record<string, { en: string; fr: string }> = {
  'fiche de residence': { en: 'Civil status', fr: 'État civil' },
  'certificat de residence': { en: 'Civil status', fr: 'État civil' },
  'acte de naissance': { en: 'Civil status', fr: 'État civil' },
  'certificat de mariage': { en: 'Civil status', fr: 'État civil' },
  'autorisation de voirie': { en: 'Autorisation de voirie', fr: 'Autorisation de voirie' },
};

const POSITION_LABELS: Record<string, { en: string; fr: string }> = {
  'fiche_residence': { en: 'Residence Form', fr: 'Fiche de résidence' },
  'certificat_residence': { en: 'Residence Certificate', fr: 'Certificat de résidence' },
  'acte_naissance': { en: 'Birth Certificate', fr: 'Acte de naissance' },
  'certificat_mariage': { en: 'Marriage Certificate', fr: 'Certificat de mariage' },
  'autorisation de voirie': { en: 'Road Occupancy Permit', fr: 'Autorisation de voirie' },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const isMatch = (a: string, b: string | null) =>
  b ? a.toLowerCase().trim() === b.toLowerCase().trim() : false;

const getEmpName = (emp: any) => ({
  first: emp?.firstName ?? emp?.first_name ?? emp?.prenom ?? '',
  last: emp?.lastName ?? emp?.last_name ?? emp?.nom ?? '',
});

const translateService = (s: string) =>
  SERVICE_LABELS[s?.toLowerCase()]?.fr ?? s;

const translatePosition = (p: string) =>
  POSITION_LABELS[p?.toLowerCase()]?.fr ?? p;

export function MunicipalAgentDashboard({ user, onLogout, employees, tasks, isDark, toggleDarkMode }: MunicipalAgentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newEmployeeService, setNewEmployeeService] = useState<string>('État civil');
  const [newEmployeePosition, setNewEmployeePosition] = useState<string>('Fiche de résidence');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { t, language } = useLanguage();

  // ── Validation state ───────────────────────────────────────────────────
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [validationView, setValidationView] = useState<'table' | 'detail'>('table');
  const [rejectReason, setRejectReason] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [validationStatusFilter, setValidationStatusFilter] = useState<'all' | 'en_attente' | 'termine' | 'refuse'>('all');

  // ── Chat state ─────────────────────────────────────────────────────────
  const [chats, setChats] = useState<CitizenChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const [citizens, setCitizens] = useState<any[]>([]);

  const pendingCount = requests.filter((r) => r.status === 'en_attente').length;
  const unreadCount = chats.reduce((acc, c) => acc + c.messages.filter((m) => !m.read && m.from === 'citizen').length, 0);
  const activeChat = chats.find((c) => c.citizenId === activeChatId) ?? null;
  const currentRequestStatus = selectedRequest ? selectedRequest.status : 'en_attente';
  const isProcessed = currentRequestStatus === 'termine' || currentRequestStatus === 'refuse';

  const totalEmployees = employees.employees.length;
  const activeEmployees = employees.employees.filter((e) => e.status === 'active').length;
  const totalTasks = tasks.tasks.length;
  const completedTasks = tasks.tasks.filter((t) => t.status === 'completed').length;

  const filteredEmployees = employees.employees.filter((e) => {
    const { first, last } = getEmpName(e);
    const q = searchQuery.toLowerCase();
    return first.toLowerCase().includes(q) || last.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
  });

  const allRealEmployees = employees.employees;

  const employeesByService = SERVICES.map((s) => ({
    ...s,
    employees: employees.employees.filter((e) => e.service?.toLowerCase() === s.nameFr.toLowerCase()),
  }));

  // ── Fetch Data ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/validations`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        }
      });
      const data = await res.json();

      if (data.data) {
        const normalized = data.data.map((req: any) => normalizeRequest(req));
        setRequests(normalized);
        setDemandes(data.data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          typeDocument: d.type_document,
          firstName: d.firstName || d.prenom,
          lastName: d.nom,
          nin: d.nin,
          commune: d.commune,
          dateNaissance: d.date_naissance,
          dateDemande: d.date_demande,
          status: d.status,
          rejectionReason: d.commentaire,
          photoCniPath: d.photo_cni_path,
          photoDomicilePath: d.photo_domicile_path
        })));
      }
    } catch (err) {
      console.error('Validations fetch error:', err);
      setRequests([]);
    }

    try {
      const { data, error } = await supabase
        .schema('register')
        .from('citizens_safe')
        .select('*');

      if (error) {
        console.error('Supabase citizens_safe error:', error.message);
        return;
      }
      setCitizens(data);
    } catch (err) {
      console.error('Supabase fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [language]);

  // ── Socket.IO ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('agent:join');
      socket.emit('chat:get-conversations');
    });

    socket.on('chat:conversations', (conversations: CitizenChat[]) => {
      setChats(conversations);
    });

    socket.on('chat:new-message', (data) => {
      setChats((prev) => {
        const existing = prev.find((c) => c.citizenId === data.citizenId);
        if (existing) {
          return prev.map((c) =>
            c.citizenId === data.citizenId
              ? { ...c, messages: [...c.messages, data.message] }
              : c
          );
        }
        return [...prev, {
          citizenId: data.citizenId,
          citizenName: data.citizenName,
          citizenEmail: data.citizenEmail,
          messages: [data.message]
        }];
      });

      if (activeChatId !== data.citizenId && data.message.from === 'citizen') {
        toast.info(`New message from ${data.citizenName}`);
      }
    });

    socket.on('chat:message-sent', (data) => {
      setChats((prev) =>
        prev.map((c) =>
          c.citizenId === data.citizenId
            ? { ...c, messages: [...c.messages, data.message] }
            : c
        )
      );
    });

    socket.on('new_demande', (data: any) => {
      const mapped: Demande = {
        id: data.id,
        userId: data.user_id,
        typeDocument: data.type_document,
        firstName: data.prenom,
        lastName: data.nom,
        nin: data.nin,
        commune: data.commune || '',
        dateNaissance: data.date_naissance || '',
        dateDemande: data.date_demande,
        status: data.status,
        rejectionReason: data.commentaire || '',
        photoCniPath: data.photo_cni_path,
        photoDomicilePath: data.photo_domicile_path
      };
      setDemandes(prev => [mapped, ...prev]);
      toast.info(`Nouvelle demande de ${data.prenom} ${data.nom}`);
    });

    return () => {
      socket.off('connect');
      socket.off('chat:conversations');
      socket.off('chat:new-message');
      socket.off('chat:message-sent');
      socket.off('new_demande');
    };
  }, [user.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length]);

  const openChat = useCallback((citizenId: number) => {
    setActiveChatId(citizenId);
    setChats((prev) =>
      prev.map((c) =>
        c.citizenId === citizenId
          ? { ...c, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      )
    );
    socketRef.current?.emit('chat:mark-read', { citizenId });
  }, []);

  const sendAgentMessage = useCallback(() => {
    if (!chatMessage.trim() || !activeChatId || !socketRef.current) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socketRef.current.emit('chat:send-message', {
      citizenId: activeChatId,
      text: chatMessage.trim(),
      time: now,
    });
    setChatMessage('');
  }, [chatMessage, activeChatId]);

  const filteredRequests = requests.filter((r) => {
    const q = (requestSearch || '').toLowerCase();
    const matchesSearch =
      (r.firstName || '').toLowerCase().includes(q) ||
      (r.lastName || '').toLowerCase().includes(q) ||
      (r.nin || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q);
    if (validationStatusFilter === 'all') return matchesSearch;
    return matchesSearch && mapStatus(r.status) === validationStatusFilter;
  });

  const openDetail = (req: RegistrationRequest) => {
    setSelectedRequest(req);
    setValidationView('detail');
    setRejectReason('');
  };

  // ── Validate ───────────────────────────────────────────────────────────
  const handleValidate = async (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      toast.error('Format ID invalide');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/validations/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'termine' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Validation failed');
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'termine' } : r));
      setSelectedRequest((prev) => prev ? { ...prev, status: 'termine' } : prev);
      await fetchData();
      toast.success(language === 'fr' ? "Email d'activation envoyé" : 'Activation email sent');
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur de validation' : 'Validation failed');
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────
  const handleReject = async (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return;

    const reason = rejectReason.trim() ||
      "Vos informations ne correspondent pas au registre. Veuillez refaire votre demande en vous assurant que toutes les données sont correctes et lisibles.";

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/validations/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Rejection failed');
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'refuse', rejectionReason: reason } : r));
      setSelectedRequest((prev) => prev ? { ...prev, status: 'refuse', rejectionReason: reason } : prev);
      setRejectReason('');
      await fetchData();
      toast.error(language === 'fr' ? 'Demande rejetée' : 'Request rejected');
    } catch {
      toast.error(language === 'fr' ? 'Erreur de rejet' : 'Rejection failed');
    }
  };

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    employees.addEmployee({
      email: fd.get('email') as string,
      password: 'employee123',
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      role: 'employee' as const,
      service: newEmployeeService,
      position: newEmployeePosition,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active' as const
    });
    setIsAddEmployeeOpen(false);
    setNewEmployeeService('État civil');
    setNewEmployeePosition('Fiche de résidence');
    toast.success(language === 'fr' ? 'Employé ajouté' : 'Employee added');
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    tasks.addTask({
      title: fd.get('title') as string,
      assignedTo: fd.get('assignedTo') as string,
      assignedBy: user.id,
      status: 'pending' as const
    });
    setIsAddTaskOpen(false);
    toast.success(language === 'fr' ? 'Tâche assignée' : 'Task assigned');
  };

  const getStatusColor = (s: Task['status']) =>
    s === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
      s === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
        'bg-gray-100 text-gray-700 border-gray-200';

  const getTabTitle = () => {
    const titles: Record<string, { fr: string; en: string }> = {
      dashboard: { fr: 'Aperçu du tableau de bord', en: 'Dashboard Overview' },
      employees: { fr: 'Gestion des employés', en: 'Employee Management' },
      tasks: { fr: 'Gestion des tâches', en: 'Task Management' },
      validations: { fr: 'Validation des inscriptions', en: 'Registration Validations' },
      messages: { fr: 'Messages citoyens', en: 'Citizen Messages' },
      settings: { fr: 'Paramètres', en: 'Settings' },
    };
    return titles[activeTab]?.[language] ?? activeTab;
  };

  // ── Sub-components ─────────────────────────────────────────────────────
  const CompactEmployeeCard = ({ employee }: { employee: any }) => {
    const { first, last } = getEmpName(employee);
    return (
      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{first[0]}{last[0]}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate dark:text-white">{first} {last}</p>
          <p className="text-xs text-slate-500 truncate">{employee.position || employee.service}</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      </div>
    );
  };

  const SidebarItem = ({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: number }) => (
    <button
      onClick={() => { setActiveTab(value); setValidationView('table'); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${activeTab === value ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
    >
      <div className="flex items-center gap-3"><Icon className="w-5 h-5" /><span className="font-medium">{label}</span></div>
      {badge !== undefined && badge > 0 && (
        <Badge variant={activeTab === value ? 'secondary' : 'destructive'} className="text-xs">{badge}</Badge>
      )}
    </button>
  );

  const RequestStatusBadge = ({ status }: { status: any }) => {
    const styles: Record<string, string> = {
      en_attente: 'bg-amber-100 text-amber-800 border-amber-200',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      termine: 'bg-green-100 text-green-800 border-green-200',
      refuse: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, { fr: string; en: string }> = {
      en_attente: { fr: 'En attente', en: 'Pending' },
      pending: { fr: 'En attente', en: 'Pending' },
      termine: { fr: 'Terminé', en: 'Completed' },
      refuse: { fr: 'Refusé', en: 'Refused' },
    };
    const style = styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    const label = labels[status] ? labels[status][language as 'fr' | 'en'] : status;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
        {label}
      </span>
    );
  };

  const CompareRow = ({ label, citizen, registry }: { label: string; citizen: string; registry: string | null }) => {
    const match = isMatch(citizen, registry);
    const color = match ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return (
      <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <div><p className="text-xs text-slate-400 mb-0.5">{label}</p><p className={`text-sm font-medium ${color}`}>{citizen}</p></div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
          <p className={`text-sm font-medium ${color}`}>
            {registry ?? <span className="italic text-slate-400">{language === 'fr' ? 'Non trouvé dans le registre' : 'Not found in registry'}</span>}
          </p>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">

      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">BALADIYA DIGITAL</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Panneau Agent Municipal' : 'Municipal Agent Panel'}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label={t('dashboard')} value="dashboard" />
            <SidebarItem icon={Users} label={t('employees')} value="employees" />
            <SidebarItem icon={ShieldCheck} label={language === 'fr' ? "Demandes d'inscriptions" : 'Registration Requests'} value="validations" badge={pendingCount} />
            <SidebarItem icon={MessageSquare} label={language === 'fr' ? 'Messagerie assistée' : 'Assisted messaging'} value="messages" badge={unreadCount} />
            <SidebarItem icon={Settings} label={t('settings')} value="settings" />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary text-primary-foreground">{user.firstName[0]}{user.lastName[0]}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />{t('logout')}</Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getTabTitle()}</h1>
              <p className="text-slate-500 dark:text-slate-400">{language === 'fr' ? `Bienvenue, ${user.firstName} !` : `Welcome, ${user.firstName}!`}</p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <div className="relative">
                <Button variant="outline" size="icon" onClick={() => { setActiveTab('validations'); setValidationView('table'); }}>
                  <Bell className="w-4 h-4" />
                </Button>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium dark:text-white">
                  {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">

          {/* ── Dashboard ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Total des employés' : 'Total Employees'}</CardTitle>
                    <Users className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalEmployees}</div>
                    <p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" />{activeEmployees} {language === 'fr' ? 'actifs' : 'active'}</p>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{language === 'fr' ? 'Total des tâches' : 'Total Tasks'}</CardTitle>
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{totalTasks}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{language === 'fr' ? 'Pour tous les employés' : 'For all employees'}</p>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('completed')}</CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold dark:text-white">{completedTasks}</div>
                    <p className="text-xs text-green-600 mt-1">{Math.round((completedTasks / totalTasks) * 100) || 0}% {language === 'fr' ? "taux d'achèvement" : 'completion rate'}</p>
                  </CardContent>
                </Card>
              </div>

              {pendingCount > 0 && (
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 dark:border-amber-800 dark:bg-slate-800 mb-6"
                  onClick={() => { setActiveTab('validations'); setValidationView('table'); }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">
                        {pendingCount} {language === 'fr' ? "demande(s) d'inscription en attente" : 'registration request(s) awaiting review'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'fr' ? 'Cliquer pour examiner et valider' : 'Click to review and validate'}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </CardContent>
                </Card>
              )}

              <div>
                <h2 className="text-lg font-semibold dark:text-white mb-3">Services</h2>
                <div className="grid grid-cols-2 gap-4">
                  {employeesByService.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 ${selectedService === service.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedService(service.id === selectedService ? null : service.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${service.color}`} />
                          <CardTitle className="text-sm dark:text-white">{language === 'en' ? service.name : service.nameFr}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-xs text-slate-500">{service.employees.length} {language === 'en' ? 'employees' : 'employés'}</p>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{service.documents?.length || 0} Types</Badge>
                        </div>
                        <div className="space-y-2 mb-6">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                            {language === 'fr' ? 'TYPES DE DOCUMENTS' : 'DOCUMENT TYPES'}
                          </p>
                          {service.documents?.map((doc: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 hover:border-primary/30 transition-colors shadow-sm group">
                              <div className={`w-11 h-11 rounded-full ${service.color} flex items-center justify-center shadow-inner`}>
                                <span className="text-white font-bold text-lg">{doc.fr[0]}</span>
                              </div>
                              <span className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                {language === 'fr' ? doc.fr : doc.en}
                              </span>
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Employees ── */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder={language === 'fr' ? 'Rechercher...' : 'Search employees...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />{t('addEmployee')}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader><DialogTitle className="dark:text-white">{language === 'fr' ? 'Ajouter un employé' : 'Add New Employee'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>{t('firstName')}</Label><Input name="firstName" required /></div>
                        <div className="space-y-2"><Label>{t('lastName')}</Label><Input name="lastName" required /></div>
                      </div>
                      <div className="space-y-2"><Label>{t('email')}</Label><Input name="email" type="email" required /></div>
                      <div className="space-y-2">
                        <Label>{t('service')}</Label>
                        <Select name="service" required value={newEmployeeService} onValueChange={setNewEmployeeService}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="État civil">État civil</SelectItem>
                            <SelectItem value="Autorisation de voirie">Autorisation de voirie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'fr' ? 'Poste' : 'Position'}</Label>
                        <Select name="poste" required value={newEmployeePosition} onValueChange={setNewEmployeePosition}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Acte de naissance">Acte de naissance</SelectItem>
                            <SelectItem value="Fiche de résidence">Fiche de résidence</SelectItem>
                            <SelectItem value="Certificat de résidence">Certificat de résidence</SelectItem>
                            <SelectItem value="Certificat de mariage">Certificat de mariage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
                        <Button type="submit">{language === 'fr' ? "Ajouter l'employé" : 'Add Employee'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-slate-700">
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Employé' : 'Employee'}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('service')}</TableHead>
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Poste' : 'Position'}</TableHead>
                        <TableHead className="dark:text-slate-400">{t('status')}</TableHead>
                        <TableHead className="dark:text-slate-400">{language === 'fr' ? "Date d'adhésion" : 'Join Date'}</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp: any) => {
                        const { first, last } = getEmpName(emp);
                        return (
                          <TableRow key={emp.id} className="dark:border-slate-700">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8"><AvatarFallback className="bg-slate-200 text-slate-700 text-xs">{first[0]}{last[0]}</AvatarFallback></Avatar>
                                <div><p className="font-medium dark:text-white">{first} {last}</p><p className="text-sm text-slate-500">{emp.email}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="dark:text-slate-300">{translateService(emp.service) ?? '-'}</TableCell>
                            <TableCell className="dark:text-slate-300">{translatePosition(emp.position)}</TableCell>
                            <TableCell>
                              <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                                {emp.status === 'active' ? (language === 'fr' ? 'actif' : 'active') : (language === 'fr' ? 'inactif' : 'inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell className="dark:text-slate-300">{emp.joinDate}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { employees.toggleEmployeeStatus(emp.id); toast.success('Status updated'); }}>
                                    {emp.status === 'active'
                                      ? <><UserX className="w-4 h-4 mr-2" />{language === 'fr' ? 'Désactiver' : 'Deactivate'}</>
                                      : <><UserCheck className="w-4 h-4 mr-2" />{language === 'fr' ? 'Activer' : 'Activate'}</>}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { employees.deleteEmployee(emp.id); toast.success('Deleted'); }} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />{t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tasks ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-white">{t('allRequests')}</h2>
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />{language === 'fr' ? 'Assigner une tâche' : 'Assign Task'}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg dark:bg-slate-800">
                    <DialogHeader><DialogTitle className="dark:text-white">{language === 'fr' ? 'Nouvelle tâche' : 'Assign New Task'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div className="space-y-2"><Label>{language === 'fr' ? 'Titre' : 'Title'}</Label><Input name="title" required /></div>
                      <div className="space-y-2"><Label>{language === 'fr' ? 'Assigné à' : 'Assigned To'}</Label>
                        <Select name="assignedTo" required>
                          <SelectTrigger><SelectValue placeholder={language === 'fr' ? 'Sélectionner un employé' : 'Select employee'} /></SelectTrigger>
                          <SelectContent>
                            {allRealEmployees.map((emp) => {
                              const { first, last } = getEmpName(emp);
                              return <SelectItem key={emp.id} value={emp.id}>{first} {last}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
                        <Button type="submit">{language === 'fr' ? 'Assigner' : 'Assign'}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid gap-4">
                {tasks.tasks.map((task) => {
                  const emp = employees.employees.find((e) => e.id === task.assignedTo);
                  return (
                    <Card key={task.id} className="dark:bg-slate-800 dark:border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold dark:text-white">{task.title}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'completed' ? t('completed') : task.status === 'in-progress' ? t('inProgress') : t('pending')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{language === 'fr' ? 'Assigné à :' : 'Assigned to:'} {emp?.firstName} {emp?.lastName}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => tasks.completeTask(task.id)}><CheckCircle2 className="w-4 h-4 mr-2" />{language === 'fr' ? 'Terminer' : 'Mark completed'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => tasks.deleteTask(task.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── Validations ── */}
          {activeTab === 'validations' && (
            <div className="space-y-6">

              {/* TABLE VIEW */}
              {validationView === 'table' && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <Card
                      className={`cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 ${validationStatusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setValidationStatusFilter('all')}
                    >
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 mb-1">{language === 'fr' ? 'Toutes' : 'All'}</p>
                        <p className="text-2xl font-bold dark:text-white">{requests.length}</p>
                      </CardContent>
                    </Card>
                    {(['en_attente', 'termine', 'refuse'] as const).map((s) => {
                      const count = requests.filter((r) => r.status === s).length;
                      const colors = { en_attente: 'text-amber-700 dark:text-amber-400', termine: 'text-green-700 dark:text-green-400', refuse: 'text-red-700 dark:text-red-400' };
                      const labels = { en_attente: language === 'fr' ? 'En attente' : 'Pending', termine: language === 'fr' ? 'Validés' : 'Validated', refuse: language === 'fr' ? 'Rejetés' : 'Rejected' };
                      return (
                        <Card
                          key={s}
                          className={`cursor-pointer transition-all dark:bg-slate-800 dark:border-slate-700 ${validationStatusFilter === s ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setValidationStatusFilter(s)}
                        >
                          <CardContent className="p-4"><p className="text-xs text-slate-500 mb-1">{labels[s]}</p><p className={`text-2xl font-bold ${colors[s]}`}>{count}</p></CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="relative w-80 mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={language === 'fr' ? 'Rechercher par nom, NIN...' : 'Search by name, NIN...'} value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} className="pl-10" />
                  </div>

                  <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[900px]">
                          <TableHeader>
                            <TableRow className="dark:border-slate-700">
                              <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Nom complet' : 'Full name'}</TableHead>
                              <TableHead className="dark:text-slate-400">NIN</TableHead>
                              <TableHead className="dark:text-slate-400">Email</TableHead>
                              <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Adresse' : 'Address'}</TableHead>
                              <TableHead className="dark:text-slate-400">CNI</TableHead>
                              <TableHead className="dark:text-slate-400">Selfie</TableHead>
                              <TableHead className="dark:text-slate-400">{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                              <TableHead className="w-[70px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRequests.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-slate-500 italic">
                                  {language === 'fr' ? 'Aucune demande trouvée' : 'No requests found'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredRequests.map((req) => (
                                <TableRow key={req.id} className="dark:border-slate-700">
                                  <TableCell className="font-medium dark:text-white whitespace-nowrap">{req.lastName} {req.firstName}</TableCell>
                                  <TableCell className="font-mono text-xs dark:text-slate-300 whitespace-nowrap">
                                    {req.nin ? `${String(req.nin).substring(0, 9)}...` : '-'}
                                  </TableCell>
                                  <TableCell className="text-blue-600 dark:text-blue-400 text-xs whitespace-nowrap">{req.email}</TableCell>
                                  <TableCell className="dark:text-slate-300 text-xs max-w-[150px] truncate" title={req.address}>{req.address}</TableCell>
                                  <TableCell>
                                    {req.cniScanPath ? (
                                      <a href={req.cniScanPath.startsWith('http') ? req.cniScanPath : `http://localhost:5000${req.cniScanPath}`} target="_blank" rel="noreferrer">
                                        <img src={req.cniScanPath.startsWith('http') ? req.cniScanPath : `http://localhost:5000${req.cniScanPath}`} alt="CNI" width="80" className="rounded border border-slate-200 dark:border-slate-700" />
                                      </a>
                                    ) : <span className="text-xs text-slate-400 italic">No File</span>}
                                  </TableCell>
                                  <TableCell>
                                    {req.selfiePath ? (
                                      <a href={req.selfiePath.startsWith('http') ? req.selfiePath : `http://localhost:5000${req.selfiePath}`} target="_blank" rel="noreferrer">
                                        <img src={req.selfiePath.startsWith('http') ? req.selfiePath : `http://localhost:5000${req.selfiePath}`} alt="Selfie" width="80" className="rounded border border-slate-200 dark:border-slate-700" />
                                      </a>
                                    ) : <span className="text-xs text-slate-400 italic">No File</span>}
                                  </TableCell>
                                  <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                                  <TableCell>
                                    <Button size="sm" className="h-7 px-3 text-xs gap-1 whitespace-nowrap" onClick={() => openDetail(req)}>
                                      <Eye className="w-3 h-3" />{language === 'fr' ? 'Voir' : 'View'}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* DETAIL VIEW */}
              {validationView === 'detail' && selectedRequest && (
                <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="outline" size="sm" onClick={() => setValidationView('table')} className="bg-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {language === 'fr' ? 'Retour' : 'Back'}
                      </Button>
                      <div className="flex flex-col items-end">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedRequest.firstName} {selectedRequest.lastName}</h2>
                        <p className="text-sm text-slate-500">{selectedRequest.email}</p>
                      </div>
                      <RequestStatusBadge status={selectedRequest.status} />
                    </div>

                    {/* COMPARISON CARD */}
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-2">
                        <div className="p-4 bg-slate-50 border-r border-b flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'fr' ? 'Informations du citoyen' : 'Citizen Information'}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'fr' ? 'Registre (DB)' : 'Registry Record (DB)'}</span>
                        </div>
                      </div>
                      <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                          <CompareRow label={language === 'fr' ? 'Nom' : 'Last name'} citizen={selectedRequest.lastName || ''} registry={selectedRequest.reg?.lastName} />
                          <CompareRow label={language === 'fr' ? 'Prénom' : 'First name'} citizen={selectedRequest.firstName || ''} registry={selectedRequest.reg?.firstName} />
                          <CompareRow label="NIN" citizen={selectedRequest.nin} registry={selectedRequest.reg?.nin} />
                        </div>
                      </CardContent>
                    </Card>

                    {/* CNI & Selfie */}
                    <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                      <div className="px-6 py-4">
                        <p className="text-xs text-slate-400 mb-2">{language === 'fr' ? 'CNI' : 'ID Card'}</p>
                        {selectedRequest.cniScanPath ? (
                          <a href={selectedRequest.cniScanPath.startsWith('http') ? selectedRequest.cniScanPath : `http://localhost:5000${selectedRequest.cniScanPath}`} target="_blank" rel="noreferrer">
                            <img src={selectedRequest.cniScanPath.startsWith('http') ? selectedRequest.cniScanPath : `http://localhost:5000${selectedRequest.cniScanPath}`} alt="CNI" className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-600">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="text-xs text-slate-400">{language === 'fr' ? 'Aucun document' : 'No document'}</span>
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-4">
                        <p className="text-xs text-slate-400 mb-2">Selfie</p>
                        {selectedRequest.selfiePath ? (
                          <a href={selectedRequest.selfiePath.startsWith('http') ? selectedRequest.selfiePath : `http://localhost:5000${selectedRequest.selfiePath}`} target="_blank" rel="noreferrer">
                            <img src={selectedRequest.selfiePath.startsWith('http') ? selectedRequest.selfiePath : `http://localhost:5000${selectedRequest.selfiePath}`} alt="Selfie" className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </a>
                        ) : (
                          <div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-600">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="text-xs text-slate-400">{language === 'fr' ? 'Aucune photo' : 'No photo'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    {selectedRequest.status === 'en_attente' && (() => {
                      const firstNameMatch = isMatch(selectedRequest.firstName, selectedRequest.reg?.firstName);
                      const lastNameMatch = isMatch(selectedRequest.lastName, selectedRequest.reg?.lastName);
                      const ninMatch = isMatch(selectedRequest.nin, selectedRequest.reg?.nin);
                      const allFieldsMatch = firstNameMatch && lastNameMatch && ninMatch;

                      return (
                        <div className="pt-6 border-t border-slate-100 mt-6">
                          <div className="flex justify-center w-full">
                            {allFieldsMatch ? (
                              <button
                                type="button"
                                onClick={() => handleValidate(selectedRequest.id)}
                                className="w-full max-w-md flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95"
                              >
                                <ShieldCheck className="w-5 h-5" />
                                {language === 'fr' ? 'Valider - envoyer email activation' : 'Validate - send activation email'}
                              </button>
                            ) : (
                              <div className="w-full max-w-md flex flex-col gap-3">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleReject(selectedRequest.id);
                                    setRejectReason('');
                                  }}
                                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95"
                                >
                                  <XCircle className="w-5 h-5" />
                                  {language === 'fr' ? 'Rejeter - envoyer email refus' : 'Reject - send rejection email'}
                                </button>
                                <p className="text-sm text-center text-red-500 font-semibold bg-red-50 py-2 rounded-lg border border-red-100">
                                  {language === 'fr'
                                    ? 'Attention : Données non conformes au registre'
                                    : 'Warning: Data does not match the registry'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {(selectedRequest.status === 'validated' || selectedRequest.status === 'termine') && (
                      <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                        <CheckCircle2 className="w-6 h-6" />
                        {language === 'fr' ? 'Demande validée ' : 'Request validated '}
                      </div>
                    )}

                    {(selectedRequest.status === 'rejected' || selectedRequest.status === 'refuse') && (
                      <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-center gap-2 text-red-500 font-bold text-lg">
                        <XCircle className="w-6 h-6" />
                        {language === 'fr' ? 'Demande rejetée ' : 'Request rejected '}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── Messages ── */}
          {activeTab === 'messages' && (
            <div className="flex gap-6 h-[calc(100vh-180px)]">
              <div className="w-72 flex-shrink-0">
                <Card className="dark:bg-slate-800 dark:border-slate-700 h-full">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium dark:text-white">
                      {language === 'fr' ? 'Conversations' : 'Conversations'}
                    </CardTitle>
                    <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isSocketConnected ? 'Connected' : 'Disconnected'} />
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100%-60px)]">
                      {chats.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                          {language === 'fr' ? 'Aucune conversation' : 'No conversations yet'}
                        </div>
                      ) : (
                        chats.map((chat) => {
                          const unread = chat.messages.filter((m) => !m.read && m.from === 'citizen').length;
                          const last = chat.messages[chat.messages.length - 1];
                          return (
                            <button
                              key={chat.citizenId}
                              onClick={() => openChat(chat.citizenId)}
                              className={`w-full flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeChatId === chat.citizenId ? 'bg-slate-50 dark:bg-slate-700' : ''}`}
                            >
                              <Avatar className="w-9 h-9 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {chat.citizenName.split(' ').map((n) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium dark:text-white truncate">{chat.citizenName}</p>
                                  {unread > 0 && (
                                    <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center px-1 flex-shrink-0">{unread}</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{last?.text || (language === 'fr' ? 'Nouvelle conversation' : 'New conversation')}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{last?.time}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="flex-1">
                {!activeChat ? (
                  <Card className="dark:bg-slate-800 dark:border-slate-700 h-full flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">{language === 'fr' ? 'Sélectionnez une conversation' : 'Select a conversation'}</p>
                      {!isSocketConnected && <p className="text-xs text-red-400 mt-2">{language === 'fr' ? 'Connexion en cours...' : 'Connecting...'}</p>}
                    </div>
                  </Card>
                ) : (
                  <Card className="dark:bg-slate-800 dark:border-slate-700 h-full flex flex-col">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {activeChat.citizenName.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium dark:text-white text-sm">{activeChat.citizenName}</p>
                        <p className="text-xs text-slate-500">{activeChat.citizenEmail}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    <ScrollArea className="flex-1 px-5 py-4">
                      <div className="space-y-3">
                        {activeChat.messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.from === 'agent' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'}`}>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${msg.from === 'agent' ? 'text-primary-foreground/70 text-right' : 'text-slate-400'}`}>{msg.time}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex gap-3">
                        <Input
                          placeholder={language === 'fr' ? 'Écrire un message...' : 'Type a message...'}
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } }}
                          disabled={!isSocketConnected}
                          className="flex-1"
                        />
                        <Button onClick={sendAgentMessage} disabled={!chatMessage.trim() || !isSocketConnected} size="icon">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{language === 'fr' ? 'Paramètres Agent Municipal' : 'Municipal Agent Settings'}</CardTitle>
                  <CardDescription>{language === 'fr' ? 'Gérer les paramètres de votre compte' : 'Manage your account settings'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>{t('email')}</Label><Input value={user.email} disabled /></div>
                  <div className="space-y-2"><Label>{language === 'fr' ? 'Nom complet' : 'Full Name'}</Label><Input value={`${user.firstName} ${user.lastName}`} disabled /></div>
                  <div className="space-y-2"><Label>{t('service')}</Label><Input value={user.service} disabled /></div>
                  <div className="space-y-2"><Label>{language === 'fr' ? 'Poste' : 'Position'}</Label><Input value={user.position} disabled /></div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-white">{t('logout')}</p>
                      <p className="text-sm text-slate-500">{language === 'fr' ? 'Se déconnecter' : 'Sign out of your account'}</p>
                    </div>
                    <Button variant="outline" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />{t('logout')}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}