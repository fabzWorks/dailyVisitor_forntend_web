import React from 'react';
import { Home, CalendarDays, Briefcase, MapPin, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/templates';
import { BottomNavBar } from '@/components/organisms';
import { NavButton } from '@/components/molecules';
import { VisitorHome } from '@/features/visitor/HomeTab';
import { VisitorSchedule } from '@/features/visitor/ScheduleTab';
import { VisitorServices } from '@/features/visitor/ServicesTab';
import { VisitorMap } from '@/features/visitor/MapTab';
import { VisitorNotifications } from '@/features/visitor/NotificationsTab';
import { VisitorProfile } from '@/features/visitor/VisitorProfile';
import type { SessionUser } from '@/api/types';
import { useLiveData, useMarkArrived, useMarkCompleted, useRespondToRequest } from '@/hooks';
import { getErrorMessage } from '@/lib/errors';
import { useVisitorStore } from '@/store/visitorStore';

// ============================================================
// VisitorApp  -  the whole app of a service PROVIDER (milkman, newspaper, garbage)
//
//   data from the backend  -> useLiveData (TanStack Query, refreshes every 5 s)
//   buttons that change it -> useMarkArrived / useMarkCompleted / useRespondToRequest
//   which tab / screen     -> useVisitorStore (Zustand)
// ============================================================
interface VisitorAppProps {
  user: SessionUser;
  onLogout: () => void;
}

const SERVICE_TITLE: Record<string, string> = { milkman: 'Milkman', newspaper: 'Newspaper Delivery', garbage: 'Garbage Collector' };

export const VisitorApp: React.FC<VisitorAppProps> = ({ user, onLogout }) => {
  const { notifications, subscriptions, deliveries, markAllRead } = useLiveData(user);
  const ui = useVisitorStore();
  const arrive = useMarkArrived();
  const complete = useMarkCompleted();
  const respondToRequest = useRespondToRequest();

  const serviceLabel = SERVICE_TITLE[user.service ?? ''] ?? 'Service Provider';

  // which request's Accept / Reject is being sent right now (shows the spinner on that card)
  const respondingId = respondToRequest.isPending ? respondToRequest.variables.requestId : null;

  // red badge: requests still waiting for this provider's answer + new notes from residents
  const pendingCount =
    notifications.filter(n => n.type === 'new_request' && n.request?.status === 'pending').length +
    notifications.filter(n => n.type === 'resident_note' && !n.isRead).length;

  // open notifications -> notes are marked as seen
  const openNotifications = () => { ui.openNotifications(); markAllRead(); };

  // "I am arrived" -> the resident gets a notification (with a text box for an extra note)
  const markArrived = async (subDbId: number, date: string, residentName: string) => {
    try {
      await arrive.mutateAsync({ subscriptionId: subDbId, providerId: user.id, date });
      toast.success(`${residentName} has been notified that you arrived`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // "Service done" -> the resident gets a "service done" notification
  const markDone = async (subDbId: number, date: string, residentName: string) => {
    try {
      await complete.mutateAsync({ subscriptionId: subDbId, providerId: user.id, date });
      toast.success(`Service done — ${residentName} has been notified`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Accept / Reject -> saved in DB; resident gets a notification; accepted ones land in both schedules
  const respond = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      await respondToRequest.mutateAsync({ requestId, providerId: user.id, action });
      const n = notifications.find(x => x.request?.id === requestId)?.request;
      if (action === 'accept') toast.success(`Accepted: ${n?.serviceLabel ?? 'service'} for ${n?.resident.name ?? 'resident'} — added to your schedule`);
      else toast.error(`Rejected: ${n?.serviceLabel ?? 'service'} request`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const renderHome = () => (
    <VisitorHome
      onOpenNotifications={openNotifications}
      onLogout={onLogout}
      outOfStation={ui.outOfStation}
      onCancelOos={ui.cancelOutOfStation}
      notifCount={pendingCount}
      onGoToSchedule={ui.goToSchedule}
      subscriptions={subscriptions}
      deliveries={deliveries}
      onArrive={markArrived}
      onComplete={markDone}
      onNavigate={ui.goToMap}
      userName={user.name}
      serviceLabel={serviceLabel}
    />
  );

  const renderContent = () => {
    if (ui.showNotifications) {
      return (
        <VisitorNotifications
          onBack={ui.closeNotifications}
          notifications={notifications}
          respondingId={respondingId}
          onAccept={(requestId) => respond(requestId, 'accept')}
          onReject={(requestId) => respond(requestId, 'reject')}
        />
      );
    }
    switch (ui.activeTab) {
      case 'schedule':
        return (
          <VisitorSchedule
            alternates={ui.alternates}
            outOfStation={ui.outOfStation}
            onOosChange={ui.setOutOfStation}
            subscriptions={subscriptions}
            deliveries={deliveries}
            onAddAlternate={ui.addAlternate}
          />
        );
      case 'services':
        return <VisitorServices subscriptions={subscriptions} deliveries={deliveries} serviceLabel={serviceLabel} />;
      case 'map':
        return <VisitorMap subscriptions={subscriptions} deliveries={deliveries} focusSubId={ui.mapFocusSubId} fallbackLat={subscriptions[0]?.providerLat ?? null} fallbackLng={subscriptions[0]?.providerLng ?? null} />;
      case 'profile':
        return (
          <VisitorProfile
            user={user}
            serviceLabel={serviceLabel}
            jobsDone={Object.values(deliveries).filter(d => d.completedAt).length}
            alternates={ui.alternates}
            onAlternatesChange={ui.setAlternates}
            onLogout={onLogout}
            openAddAlternate={ui.openProfileAlternates}
            onOpenAddAlternateDone={ui.clearOpenProfileAlternates}
          />
        );
      case 'home':
      default:
        return renderHome();
    }
  };

  return (
    <AppShell
      pageKey={ui.showNotifications ? 'notifications' : ui.activeTab}
      slide="vertical"
      bottomNav={!ui.showNotifications && (
        <BottomNavBar className="px-4">
          <NavButton active={ui.activeTab === 'home'} onClick={() => ui.setActiveTab('home')} icon={Home} label="Home" />
          <NavButton active={ui.activeTab === 'schedule'} onClick={() => ui.setActiveTab('schedule')} icon={CalendarDays} label="Schedule" />
          <NavButton active={ui.activeTab === 'services'} onClick={() => ui.setActiveTab('services')} icon={Briefcase} label="Services" />
          <NavButton active={ui.activeTab === 'map'} onClick={() => ui.setActiveTab('map')} icon={MapPin} label="Map" />
          <NavButton active={ui.activeTab === 'profile'} onClick={() => ui.setActiveTab('profile')} icon={UserCircle2} label="Profile" />
        </BottomNavBar>
      )}
    >
      {renderContent()}
    </AppShell>
  );
};
