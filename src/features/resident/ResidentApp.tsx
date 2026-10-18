import React from 'react';
import { Home, Briefcase, PlusCircle, CalendarDays, UserCircle2 } from 'lucide-react';
import { AppShell } from '@/components/templates';
import { BottomNavBar } from '@/components/organisms';
import { NavButton } from '@/components/molecules';
import { ResidentHome } from '@/features/resident/ResidentHome';
import { ResidentServices } from '@/features/resident/ResidentServices';
import { ResidentSchedule } from '@/features/resident/ResidentSchedule';
import { ResidentProfile } from '@/features/resident/ResidentProfile';
import { ResidentNotifications } from '@/features/resident/ResidentNotifications';
import { RequestService } from '@/features/resident/RequestService';
import type { SessionUser } from '@/api/types';
import { useLiveData } from '@/hooks';
import { useResidentStore } from '@/store/residentStore';

// ============================================================
// ResidentApp  -  the whole app of a RESIDENT
//
//   data from the backend  -> useLiveData (TanStack Query, refreshes every 5 s)
//   which tab / screen     -> useResidentStore (Zustand)
// ============================================================
interface ResidentAppProps {
  user: SessionUser;
  onLogout: () => void;
}

export const ResidentApp: React.FC<ResidentAppProps> = ({ user, onLogout }) => {
  const { notifications, subscriptions, deliveries, markAllRead } = useLiveData(user);
  const ui = useResidentStore();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const openNotifications = () => { ui.openNotifications(); markAllRead(); };

  const renderHome = () => (
    <ResidentHome
      onLogout={onLogout}
      onRequestService={ui.startRequest}
      onViewSubscription={ui.viewSubscription}
      outOfStation={ui.outOfStation}
      onOutOfStationChange={ui.setOutOfStation}
      onOpenNotifications={openNotifications}
      notifCount={unreadCount}
      onGoToSchedule={ui.goToSchedule}
      liveSubscriptions={subscriptions}
      deliveries={deliveries}
      userName={user.name}
      userAddress={user.address}
    />
  );

  const renderContent = () => {
    if (ui.showNotifications) {
      return (
        <ResidentNotifications
          notifications={notifications}
          userId={user.id}
          onOpened={markAllRead}
          onBack={ui.closeNotifications}
        />
      );
    }
    if (ui.showRequestFlow) {
      return (
        <RequestService
          initialService={ui.selectedServiceType}
          user={user}
          onClose={ui.closeRequestFlow}
        />
      );
    }
    switch (ui.activeTab) {
      case 'services':
        return (
          <ResidentServices
            subscriptions={subscriptions}
            deliveries={deliveries}
            selected={ui.selectedSubscription}
            onSelect={ui.selectSubscription}
            onRequestService={() => ui.startRequest()}
          />
        );
      case 'schedule':
        return (
          <ResidentSchedule
            residentId={user.id}
            onViewSubscription={ui.viewSubscription}
            outOfStation={ui.outOfStation}
            onOutOfStationChange={ui.setOutOfStation}
            neighbours={ui.neighbours}
            onAddAlternate={ui.addAlternate}
            liveSubscriptions={subscriptions}
            deliveries={deliveries}
          />
        );
      case 'profile':
        return (
          <ResidentProfile
            user={user}
            activeServices={subscriptions.filter(s => s.status === 'Active').length}
            neighbours={ui.neighbours}
            onNeighboursChange={ui.setNeighbours}
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

  const showNav = !ui.showRequestFlow && !ui.showNotifications;
  const pageKey = ui.showNotifications
    ? 'notifications'
    : ui.showRequestFlow
      ? 'request'
      : ui.activeTab + (ui.selectedSubscription ? '-detail' : '');

  return (
    <AppShell
      pageKey={pageKey}
      slide="horizontal"
      bottomNav={showNav && (
        <BottomNavBar className="px-6">
          <NavButton active={ui.activeTab === 'home'} onClick={() => ui.setActiveTab('home')} icon={Home} label="Home" />
          <NavButton active={ui.activeTab === 'services'} onClick={ui.openServicesTab} icon={Briefcase} label="Services" />
          <div className="relative -top-6">
            <button
              onClick={() => ui.startRequest()}
              className="w-14 h-14 bg-blue-600 rounded-full shadow-xl shadow-blue-300 flex items-center justify-center text-white hover:scale-105 transition-transform"
            >
              <PlusCircle className="w-7 h-7" />
            </button>
          </div>
          <NavButton active={ui.activeTab === 'schedule'} onClick={() => ui.setActiveTab('schedule')} icon={CalendarDays} label="Schedule" />
          <NavButton active={ui.activeTab === 'profile'} onClick={() => ui.setActiveTab('profile')} icon={UserCircle2} label="Profile" />
        </BottomNavBar>
      )}
    >
      {renderContent()}
    </AppShell>
  );
};
