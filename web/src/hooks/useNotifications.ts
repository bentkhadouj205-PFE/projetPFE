import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';

export interface EmployeeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId?: string;
  citizenName?: string;
  citizenNin?: string;
  citizenEmail?: string;
  wilaya?: string;
  commune?: string;
  citizenFirstName?: string;
  citizenLastName?: string;
  actYear?: string;
  actNumber?: string;
  position: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export function useNotifications(employeeId: string, service?: string) {
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/requests?service=${service}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('API RAW:', data);

      const rawItems = data.requests || [];
      console.log('REQUESTS BEFORE SET:', rawItems);

      const mapped = rawItems.map((n: any) => ({
        id: n.id,
        requestId: n.id,
        title: n.title || `Demande de ${n.type_document || 'document'}`,
        message: n.message || `Nouvelle demande de ${n.prenom || ''} ${n.nom || ''}`,
        type: n.service || n.type_document || 'general',
        read: n.is_read ?? false,
        createdAt: n.created_at ?? n.date_demande ?? new Date().toISOString(),
        position: n.position || '',
        link: '#',
        // Populate additional fields so notifications render details nicely
        citizenName: n.prenom && n.nom ? `${n.prenom} ${n.nom}` : undefined,
        citizenNin: n.nin || undefined,
        citizenEmail: n.email || undefined,
        wilaya: n.wilaya_naissance || n.wilaya || undefined,
        commune: n.commune || undefined,
        citizenFirstName: n.prenom || undefined,
        citizenLastName: n.nom || undefined,
        actYear: n.annee_acte || undefined,
        actNumber: n.num_acte || undefined,
        // Carte de séjour fields
        cni: n.nin || undefined,
        dateNaissance: n.date_naissance || undefined,
        adresse: n.adresse || undefined,
        cniFileUrl: n.cni_recto_path || n.cni_scan_path || undefined,
        factureFileUrl: n.facture_resid_url || n.photo_domicile_path || undefined,
      }));

      setNotifications([...mapped]);
      console.log('TABLE DATA SOURCE (Notifications):', mapped);
    } catch (err) {
      console.error('FETCH ERROR:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, service]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${notificationId}/read`, {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/employee/${employeeId}/read-all`, {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getUnreadCount = () => notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    getUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
}