import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface Request {
  _id: string;
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
  };
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  documentStatus: string;
  serviceType: string;
  createdAt: string;
  assignedTo: string;
}

export function useRealRequests(employeeId: string) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async (service?: string) => {
    if (!employeeId && !service) {
      setRequests([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const url = service 
        ? `${API_BASE_URL}/requests?service=${service}`
        : `${API_BASE_URL}/requests/my-requests/${employeeId}`;
        
      const response = await fetch(url);
      const data = await response.json();
      console.log('API RESPONSE RAW:', data);
      
      if (response.ok) {
        const transformedRequests = data.requests?.map((req: any) => {
          const st = req.status === 'en_attente' ? 'pending'
            : req.status === 'en_traitement' ? 'in-progress'
            : req.status === 'approuve' ? 'completed'
            : req.status === 'rejete' ? 'rejected'
            : req.status;

          return {
            id: req.id,
            _id: req.id,
            citizen: {
              firstName: req.prenom,
              lastName: req.nom,
              nin: req.nin,
              email: req.email || '',
              commune: req.commune || '',
              wilaya: req.wilaya_naissance || '',
            },
            subject: req.type_document,
            title: req.type_document,
            serviceType: req.type_document,
            requestType: req.type_document,
            description: `Demande de ${req.type_document}`,
            status: st,
            createdAt: req.date_demande,
            assignedTo: req.user_id,
            documentStatus: 'pending',
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

  const getTasksByEmployee = (id: string) => requests.filter(r => r.assignedTo === id);

  return {
    requests,
    loading,
    fetchRequests,
    getTasksByEmployee,
  };
}

export default useRealRequests;