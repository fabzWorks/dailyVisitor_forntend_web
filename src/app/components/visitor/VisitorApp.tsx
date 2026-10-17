import React, { useState } from 'react';
import { Home, CalendarDays, Briefcase, MapPin, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VisitorHome } from './HomeTab';
import { VisitorSchedule } from './ScheduleTab';
import { VisitorServices } from './ServicesTab';
import { VisitorMap } from './MapTab';
import { VisitorNotifications } from './NotificationsTab';
import { VisitorProfile } from './VisitorProfile';
import type { VisitorOosState } from './ScheduleTab';
import type { VisitorAlternate } from '../../data/shared/types';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import type { SessionUser } from '../../lib/api';
import { useLiveData } from '../../lib/useLiveData';
export type Tab = 'home' | 'schedule' | 'services' | 'map' | 'profile';
interface VisitorAppProps {
  user: SessionUser;
  onLogout: () => void;
}
const SERVICE_TITLE: Record<string, string> = { milkman: 'Milkman', newspaper: 'Newspaper Delivery', garbage: 'Garbage Collector' };
export const VisitorApp: React.FC<VisitorAppProps> = ({ user, onLogout }) => {
  const { notifications, subscriptions, deliveries, refresh, markAllRead } = useLiveData(user);
  // Navigate button on the dashboard -> Map tab, focused on that resident
  const [mapFocusSubId, setMapFocusSubId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [outOfStation, setOutOfStation] = useState<VisitorOosState>({ active: false, decisions: [] });
  const [alternates, setAlternates] = useState<VisitorAlternate[]>([]);
  const serviceLabel = SERVICE_TITLE[user.service ?? ''] ?? 'Service Provider';
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [openProfileAlternates, setOpenProfileAlternates] = useState(false);
  // red badge: requests still waiting for this provider's answer + new notes from residents
  const pendingCount =
    notifications.filter(n => n.type === 'new_request' && n.request?.status === 'pending').length +
    notifications.filter(n => n.type === 'resident_note' && !n.isRead).length;
  // open notifications -> notes are marked as seen
  const openNotifications = () => { setShowNotifications(true); markAllRead(); };
  // "I am arrived" -> the resident gets a notification (with a text box for an extra note)
  const markArrived = async (subDbId: number, date: string, residentName: string) => {
    try {
      await api(`/api/subscriptions/${subDbId}/arrive`, { body: { providerId: user.id, date } });
      toast.success(`${residentName} has been notified that you arrived`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  // "Service done" -> the resident gets a "service done" notification
  const markDone = async (subDbId: number, date: string, residentName: string) => {
    try {
      await api(`/api/subscriptions/${subDbId}/complete`, { body: { providerId: user.id, date } });
      toast.success(`Service done — ${residentName} has been notified`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const goToMap = (subDbId: number) => { setMapFocusSubId(subDbId); setActiveTab('map'); };
  const handleCancelOos = () => setOutOfStation({ active: false, decisions: [] });
  // Accept / Reject -> saved in DB; resident gets a notification; accepted ones land in both schedules
  const respond = async (requestId: number, action: 'accept' | 'reject') => {
    setRespondingId(requestId);
    try {
      await api(`/api/requests/${requestId}/respond`, { body: { providerId: user.id, action } });
      const n = notifications.find(x => x.request?.id === requestId)?.request;
      if (action === 'accept') toast.success(`Accepted: ${n?.serviceLabel ?? 'service'} for ${n?.resident.name ?? 'resident'} — added to your schedule`);
      else toast.error(`Rejected: ${n?.serviceLabel ?? 'service'} request`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message);
      await refresh();
    } finally {
      setRespondingId(null);
    }
  };
  const handleAccept = (requestId: number) => respond(requestId, 'accept');
  const handleReject = (requestId: number) => respond(requestId, 'reject');
  const handleGoToSchedule = () => {
    setActiveTab('schedule');
  };
  const handleAddAlternate = () => {
    setOpenProfileAlternates(true);
    setActiveTab('profile');
  };
  const renderContent = () => {
    if (showNotifications) {
      return (
        <VisitorNotifications
          onBack={() => setShowNotifications(false)}
          notifications={notifications}
          respondingId={respondingId}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return (
          <VisitorHome
            onOpenNotifications={openNotifications}
            onLogout={onLogout}
            outOfStation={outOfStation}
            onCancelOos={handleCancelOos}
            notifCount={pendingCount}
            onGoToSchedule={handleGoToSchedule}
            subscriptions={subscriptions}
            deliveries={deliveries}
            onArrive={markArrived}
            onComplete={markDone}
            onNavigate={goToMap}
            userName={user.name}
            serviceLabel={SERVICE_TITLE[user.service ?? ''] ?? 'Service Provider'}
          />
        );
      case 'schedule':
        return (
          <VisitorSchedule
            alternates={alternates}
            outOfStation={outOfStation}
            onOosChange={setOutOfStation}
            subscriptions={subscriptions}
            deliveries={deliveries}
            onAddAlternate={handleAddAlternate}
          />
        );
      case 'services':
        return <VisitorServices subscriptions={subscriptions} deliveries={deliveries} serviceLabel={serviceLabel} />;
      case 'map':
        return <VisitorMap subscriptions={subscriptions} deliveries={deliveries} focusSubId={mapFocusSubId} fallbackLat={subscriptions[0]?.providerLat ?? null} fallbackLng={subscriptions[0]?.providerLng ?? null} />;
      case 'profile':
        return (
          <VisitorProfile
            user={user}
            serviceLabel={serviceLabel}
            jobsDone={Object.values(deliveries).filter(d => d.completedAt).length}
            alternates={alternates}
            onAlternatesChange={setAlternates}
            onLogout={onLogout}
            openAddAlternate={openProfileAlternates}
            onOpenAddAlternateDone={() => setOpenProfileAlternates(false)}
          />
        );
      default:
        return (
          <VisitorHome
            onOpenNotifications={openNotifications}
            onLogout={onLogout}
            outOfStation={outOfStation}
            onCancelOos={handleCancelOos}
            notifCount={pendingCount}
            onGoToSchedule={handleGoToSchedule}
            subscriptions={subscriptions}
            deliveries={deliveries}
            onArrive={markArrived}
            onComplete={markDone}
            onNavigate={goToMap}
            userName={user.name}
            serviceLabel={SERVICE_TITLE[user.service ?? ''] ?? 'Service Provider'}
          />
        );
    }
  };
  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={showNotifications ? 'notifications' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      {!showNotifications && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-50">
          <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="Home" />
          <NavButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={CalendarDays} label="Schedule" />
          <NavButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={Briefcase} label="Services" />
          <NavButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={MapPin} label="Map" />
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserCircle2} label="Profile" />
        </div>
      )}
    </div>
  );
};
const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : 'bg-transparent'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
