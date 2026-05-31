import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uvmruxcjpgovdrwvykyn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GF__NHm1x5YVLBdPIA5hsw_FauKPiRA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface Request {
  id: string;
  citizen: {
    firstName: string;
    lastName: string;
    email: string;
    nin: string;
    address: string;
    wilaya?: string;
    commune?: string;
    actYear?: string;
    actNumber?: string;
    cniFileUrl?: string | null;
    factureFileUrl?: string | null;
    selfiePath?: string | null;
    dateNaissance?: string;
  };
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  documentStatus: string;
  serviceType: string;
  createdAt: string;
  assignedTo: string;
  dateTraitement?: string | null;
}

export function useRealRequests(employeeId: string) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const lastServiceRef = useRef<string | undefined>(undefined);

  const fetchRequests = useCallback(async (service?: string) => {
    // Fallback to last known service if none provided
    const activeService = service !== undefined ? service : lastServiceRef.current;
    if (service !== undefined) {
      lastServiceRef.current = service;
    }

    if (!employeeId && !activeService) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = activeService
        ? `${API_BASE_URL}/requests?service=${activeService}`
        : `${API_BASE_URL}/requests/my-requests/${employeeId}`;

      const response = await fetch(url);
      const data = await response.json();
      console.log('API RESPONSE RAW:', data);

      if (response.ok) {
        const transformedRequests = data.requests?.map((req: any) => {
          const rawStatus = (req.status || req.statut || '').toLowerCase();
          const st = ['en_attente', 'pending', 'en attente'].includes(rawStatus) ? 'pending'
            : ['en_traitement', 'in-progress', 'in progress'].includes(rawStatus) ? 'in-progress'
              : ['approuve', 'completed', 'termine', 'terminé', 'approuvé'].includes(rawStatus) ? 'completed'
                : ['rejete', 'rejected', 'rejeté', 'refuse', 'refusé'].includes(rawStatus) ? 'rejected'
                  : rawStatus || 'pending';

          return {
            id: req.id,
            _id: req.id,
            citizen: {
              firstName: req.prenom || req.citizen_first_name || '',
              lastName: req.nom || req.citizen_last_name || '',
              nin: req.nin || req.citizen_nin || '',
              email: req.email || req.citizen_email || '',
              commune: req.commune || '',
              wilaya: req.wilaya_naissance || '',
              address: req.adresse || req.citizen_address || '',
              cniFileUrl: req.cni_recto_path || req.cni_scan_path || null,
              factureFileUrl: req.facture_resid_url || req.photo_domicile_path || null,
              selfiePath: req.photo_selfie_url || req.photo_selfie_path || null,
              dateNaissance: req.date_naissance || '',
              actYear: req.annee_acte || '',
              actNumber: req.num_acte || '',
            },
            subject: req.type_document || req.subject,
            title: req.type_document || req.subject,
            serviceType: req.type_document || req.subject,
            requestType: req.type_document || req.subject,
            description: `Demande de ${req.type_document || req.subject}`,
            status: st,
            createdAt: req.date_demande || req.created_at,
            assignedTo: req.user_id,
            documentStatus: 'pending',
            dateTraitement: req.date_traitement || null,
          };
        }) || [];

        setRequests(transformedRequests);
        console.log('TABLE DATA SOURCE:', transformedRequests);
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);
  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel('demandes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demandes' },
        (payload) => {
          console.log(' Realtime change detected:', payload);
          // Directly refetch from the API to guarantee the table stays perfectly synced
          fetchRequests();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, fetchRequests]);

  const getTasksByEmployee = (id: string) => requests.filter(r => r.assignedTo === id);

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/requests/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approuve' }),
      });
      if (response.ok) {
        setRequests(prev => prev.map(r => r.id === taskId ? { ...r, status: 'completed' } : r));
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const updateTask = async (taskId: string, updates: any) => {
    // Map internal status back to DB status if needed
    const dbStatus = updates.status === 'completed' ? 'approuve'
      : updates.status === 'rejected' ? 'rejete'
        : updates.status === 'pending' ? 'en_attente'
          : updates.status;

    try {
      const response = await fetch(`${API_BASE_URL}/requests/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, status: dbStatus }),
      });
      if (response.ok) {
        setRequests(prev => prev.map(r => r.id === taskId ? { ...r, ...updates } : r));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return {
    requests,
    loading,
    fetchRequests,
    getTasksByEmployee,
    completeTask,
    updateTask,
  };
}

export default useRealRequests;