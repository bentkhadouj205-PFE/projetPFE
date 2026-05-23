import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import type { EmployeeNotification } from '@/types/citizen';
import {
  Bell, Check, CheckCheck, FileText, User, AlertCircle,
  ChevronRight, MapPin, Hash, Calendar, CreditCard, FileImage, Home,
  CheckSquare,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationsPanelProps {
  notifications: EmployeeNotification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onViewRequest: (requestId: string) => void;
  onGoToTasks?: () => void;
}

export function NotificationsPanel({
  notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onViewRequest, onGoToTasks,
}: NotificationsPanelProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    onMarkAsRead(notificationId);
    toast.success('Notification marquée comme lue');
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead();
    toast.success('Toutes les notifications sont marquées comme lues');
  };

  const handleViewRequest = (notification: EmployeeNotification) => {
    onMarkAsRead(notification.id);
    if (notification.requestId) onViewRequest(notification.requestId);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: EmployeeNotification['type']) => {
    switch (type) {
      case 'new-request': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'request-updated': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'request-assigned': return <User className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  // Detect if this notification is for Carte de séjour (Fatima)
  const isCarteSejourNotif = (n: EmployeeNotification) =>
    !!(n.cni || n.factureFileUrl || n.cniFileUrl || n.dateNaissance || n.adresse);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          {unreadCount > 0 && (
            <Badge variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(100vw-2rem,520px)] p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs dark:bg-slate-700 dark:text-slate-200">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {notifications.some((n) => !n.read) && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}
              className="text-xs hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300">
              <CheckCheck className="w-3 h-3 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[450px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Aucune notification</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Les nouvelles demandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification) => (
                <div key={notification.id} onClick={() => handleViewRequest(notification)}
                  className={`p-4 cursor-pointer transition-colors ${
                    !notification.read
                      ? 'bg-blue-50/50 dark:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {notification.citizenName?.split(' ').map(n => n[0]).join('') || '?'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </p>
                        {!notification.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      </div>

                      {/* Message */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {notification.message}
                      </p>

                      {/* Info Card */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {notification.citizenName || 'Non spécifié'}
                          </span>
                        </div>

                        {/* NIN */}
                        {notification.citizenNin && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              NIN: {notification.citizenNin}
                            </span>
                          </div>
                        )}

                        {/* ── Acte de naissance fields (Sarah) ── */}
                        {(notification.wilaya || notification.commune || notification.actYear || notification.actNumber) && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
                            {notification.wilaya && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">Wilaya</span> {notification.wilaya}</span>
                              </div>
                            )}
                            {notification.commune && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">Commune</span> {notification.commune}</span>
                              </div>
                            )}
                            {notification.actYear && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">Année</span> {notification.actYear}</span>
                              </div>
                            )}
                            {notification.actNumber && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Hash className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">N° acte</span> {notification.actNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Carte de séjour fields (Fatima) ── */}
                        {isCarteSejourNotif(notification) && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
                            {notification.cni && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CreditCard className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">CNI</span> {notification.cni}</span>
                              </div>
                            )}
                            {notification.dateNaissance && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">Naissance</span> {notification.dateNaissance}</span>
                              </div>
                            )}
                            {notification.adresse && (
                              <div className="flex items-center gap-1.5 col-span-2 min-w-0">
                                <Home className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate"><span className="font-medium">سكن</span> {notification.adresse}</span>
                              </div>
                            )}
                            {notification.cniFileUrl && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileImage className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                <a href={notification.cniFileUrl} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-blue-500 hover:underline truncate">
                                  CNI Photo
                                </a>
                              </div>
                            )}
                            {notification.factureFileUrl && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileImage className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                <a href={notification.factureFileUrl} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-blue-500 hover:underline truncate">
                                  Facture Photo
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  </div>

                  {/* Mark as read */}
                  <div className="flex items-center justify-end mt-3">
                    {!notification.read && (
                      <Button variant="ghost" size="sm"
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        className="h-7 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300">
                        <Check className="w-3 h-3 mr-1" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onGoToTasks?.();
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-primary hover:bg-slate-200 dark:hover:bg-slate-700 w-full flex items-center justify-center gap-1.5 h-8"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {language === 'fr' ? 'Accéder à mes tâches' : 'Go to my tasks'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}