import React, { useState } from 'react';
import { Home, Briefcase, PlusCircle, CalendarDays, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResidentHome } from './ResidentHome';
import { ResidentServices } from './ResidentServices';
import { ResidentSchedule } from './ResidentSchedule';
import { ResidentProfile } from './ResidentProfile';
import { ResidentNotifications } from './ResidentNotifications';
import { RequestService } from './RequestService';
import type { Neighbour } from '../../data/shared/types';
import type { SessionUser, LiveSubscription } from '../../lib/api';
import { useLiveData } from '../../lib/useLiveData';
export type ResidentTab = 'home' | 'services' | 'schedule' | 'profile';
interface ResidentAppProps {
  user: SessionUser;
  onLogout: () => void;
}
import type { ServiceDecision, OutOfStationState } from './ResidentSchedule';
export const ResidentApp: React.FC<ResidentAppProps> = ({ user, onLogout }) => {
  const { notifications, subscriptions, deliveries, refresh, markAllRead } = useLiveData(user);
  const [activeTab, setActiveTab] = useState<ResidentTab>('home');
  const [showRequestFlow, setShowRequestFlow] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<LiveSubscription | null>(null);
  const [outOfStation, setOutOfStation] = useState<OutOfStationState>({ active: false, selectedDates: [], serviceDecisions: [] });
  const [neighbours, setNeighbours] = useState<Neighbour[]>([]);
  const [openProfileAlternates, setOpenProfileAlternates] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const handleStartRequest = (serviceType?: string) => {
    if (serviceType) setSelectedServiceType(serviceType);
    setShowRequestFlow(true);
  };
  // tapping a service anywhere (home, schedule) opens its attendance & payment screen inside the Services tab
  const handleViewSubscription = (subscription: LiveSubscription) => {
    setSelectedSubscription(subscription);
    setActiveTab('services');
  };
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
        <ResidentNotifications
          notifications={notifications}
          userId={user.id}
          onOpened={markAllRead}
          onNoteSent={refresh}
          onBack={() => setShowNotifications(false)}
        />
      );
    }
    if (showRequestFlow) {
      return (
        <RequestService
          initialService={selectedServiceType}
          user={user}
          onRequestSent={refresh}
          onClose={() => {
            setShowRequestFlow(false);
            setSelectedServiceType(null);
          }}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return (
          <ResidentHome
            onLogout={onLogout}
            onRequestService={handleStartRequest}
            onViewSubscription={handleViewSubscription}
            outOfStation={outOfStation}
            onOutOfStationChange={setOutOfStation}
            onOpenNotifications={() => { setShowNotifications(true); markAllRead(); }}
            notifCount={unreadCount}
            onGoToSchedule={handleGoToSchedule}
            liveSubscriptions={subscriptions}
            deliveries={deliveries}
            userName={user.name}
            userAddress={user.address}
          />
        );
      case 'services':
        return (
          <ResidentServices
            subscriptions={subscriptions}
            deliveries={deliveries}
            selected={selectedSubscription}
            onSelect={setSelectedSubscription}
            onRequestService={() => handleStartRequest()}
          />
        );
      case 'schedule':
        return (
          <ResidentSchedule
            residentId={user.id}
            onRefresh={refresh}
            onViewSubscription={handleViewSubscription}
            outOfStation={outOfStation}
            onOutOfStationChange={setOutOfStation}
            neighbours={neighbours}
            onAddAlternate={handleAddAlternate}
            liveSubscriptions={subscriptions}
            deliveries={deliveries}
          />
        );
      case 'profile':
        return (
          <ResidentProfile
            user={user}
            activeServices={subscriptions.filter(s => s.status === 'Active').length}
            neighbours={neighbours}
            onNeighboursChange={setNeighbours}
            onLogout={onLogout}
            openAddAlternate={openProfileAlternates}
            onOpenAddAlternateDone={() => setOpenProfileAlternates(false)}
          />
        );
      default:
        return (
          <ResidentHome
            onLogout={onLogout}
            onRequestService={handleStartRequest}
            onViewSubscription={handleViewSubscription}
            outOfStation={outOfStation}
            onOutOfStationChange={setOutOfStation}
            onOpenNotifications={() => { setShowNotifications(true); markAllRead(); }}
            notifCount={unreadCount}
            onGoToSchedule={handleGoToSchedule}
            liveSubscriptions={subscriptions}
            deliveries={deliveries}
            userName={user.name}
            userAddress={user.address}
          />
        );
    }
  };
  const showNav = !showRequestFlow && !showNotifications;
  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={showNotifications ? 'notifications' : showRequestFlow ? 'request' : activeTab + (selectedSubscription ? '-detail' : '')}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      {showNav && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-50">
          <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="Home" />
          <NavButton active={activeTab === 'services'} onClick={() => { setSelectedSubscription(null); setActiveTab('services'); }} icon={Briefcase} label="Services" />
          <div className="relative -top-6">
            <button
              onClick={() => handleStartRequest()}
              className="w-14 h-14 bg-blue-600 rounded-full shadow-xl shadow-blue-300 flex items-center justify-center text-white hover:scale-105 transition-transform"
            >
              <PlusCircle className="w-7 h-7" />
            </button>
          </div>
          <NavButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={CalendarDays} label="Schedule" />
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
