import { useEffect, useState } from 'react';
import { Mail, Download, Trash2, FileText, Calendar, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PFEMessage {
  id: string;
  to: string;
  subject: string;
  filename: string;
  sentAt: string;
  status: string;
  certificateData: {
    fullName: string;
    wilaya: string;
    commune: string;
    actYear: string;
    actNumber: string;
    issueDate: string;
  };
}

export function BoiteMessagePFE() {
  const [messages, setMessages] = useState<PFEMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/email/boite/pfe');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching PFE messages:', err);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/email/boite/pfe/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Message supprimé');
        fetchMessages();
      }
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = (msg: PFEMessage) => {
    // In production, fetch actual PDF from server
    toast.info(`Téléchargement simulé: ${msg.filename}`);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Chargement de la boite PFE...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Boite Message PFE</h2>
            <p className="text-slate-500 text-sm">Suivi des certificats envoyés par email</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
            {messages.length} Documents
          </span>
          <Button variant="outline" size="sm" onClick={fetchMessages} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Mail className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Aucun message envoyé</h3>
          <p className="text-slate-500">Les certificats envoyés par email apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{msg.subject}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(msg.sentAt).toLocaleString('fr-FR')}
                        </span>
                        <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {msg.status === 'sent' ? 'Envoyé' : msg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{msg.certificateData.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{msg.to}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {msg.certificateData.wilaya} • {msg.certificateData.commune}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="font-bold text-slate-400">ACTE:</span> 
                      N°{msg.certificateData.actNumber} / {msg.certificateData.actYear}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-6">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(msg)}
                    className="bg-slate-800 hover:bg-slate-900 text-white gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(msg.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple MapPin icon since I forgot to import it
function MapPin({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
