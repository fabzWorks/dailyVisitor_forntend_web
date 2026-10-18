import React, { useState, useMemo } from 'react';
import { Card, Badge, Button } from '@/components/atoms';
import { Bell, Sparkles, LogOut, ChevronRight, CheckCircle2, MessageSquare, Calendar as CalendarIcon, XCircle, Phone, AlertTriangle, MapPin, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { todaysOccurrences, dashboardGroupOf, deliveryKey } from '@/lib/schedule';
import type { DeliveryMap } from '@/lib/schedule';
import type { LiveSubscription } from '@/lib/mappers';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/_unused/shadcn/drawer';
import type { OutOfStationState } from '@/types/outOfStation';
interface ResidentHomeProps {
  onRequestService: (type: string) => void;
  onLogout: () => void;
  onViewSubscription?: (subscription: LiveSubscription) => void;
  outOfStation: OutOfStationState;
  onOutOfStationChange: (oos: OutOfStationState) => void;
  onOpenNotifications?: () => void;
  notifCount?: number;
  liveSubscriptions?: LiveSubscription[];
  deliveries?: DeliveryMap;
  userName?: string;
  userAddress?: string;
  onGoToSchedule?: () => void;
}
function formatOosDates(dates: string[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort();
  const formatted = sorted.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  });
  if (formatted.length <= 4) return formatted.join(', ');
  return `${formatted.slice(0, 3).join(', ')} + ${formatted.length - 3} more`;
}
const EMPTY_SUBS: LiveSubscription[] = [];
const NO_DELIVERIES: DeliveryMap = {};
export const ResidentHome: React.FC<ResidentHomeProps> = ({
  onRequestService,
  onLogout,
  onViewSubscription,
  outOfStation,
  onOutOfStationChange,
  onOpenNotifications,
  notifCount = 0,
  liveSubscriptions = EMPTY_SUBS,
  deliveries = NO_DELIVERIES,
  userName = '',
  userAddress = '',
  onGoToSchedule,
}) => {
  // re-evaluate "now" every 30 s so a service flips from Upcoming -> Pending -> Delayed
  const [now, setNow] = useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const [selectedSubscription, setSelectedSubscription] = useState<LiveSubscription | null>(null);
  // Real subscriptions (accepted requests) come from the database
  const mySubscriptions = useMemo(() => liveSubscriptions, [liveSubscriptions]);
  // Dashboard = ONLY today's services (everything else lives in the Schedule tab)
  const upcomingDeliveries = todaysOccurrences(mySubscriptions, now).map(o => {
    const delivery = deliveries[deliveryKey(o.sub.dbId, o.date)];
    const status: 'completed' | 'delayed' | 'pending' | 'upcoming' | 'skipped' = delivery?.skippedAt
  ? 'skipped'
  : delivery?.completedAt
    ? 'completed'
    : dashboardGroupOf(o, now);
    return { ...o.sub, status2: status, arrived: !!delivery?.arrivedAt };
  });
  const closeDrawer = () => setSelectedSubscription(null);
  const handleSubscriptionClick = (subscription: LiveSubscription) => {
    if (onViewSubscription) onViewSubscription(subscription);
    else setSelectedSubscription(subscription);
  };
  const handleChatClick = () => toast.info(`Opening chat with ${selectedSubscription?.visitorName}...`);
  const handleCallClick = () => toast.info(`Calling ${selectedSubscription?.visitorName}...`);
  const handleCancelOos = () => {
    onOutOfStationChange({ active: false, selectedDates: [], serviceDecisions: [] });
    toast.success('Out of Station cancelled. Services resumed.');
  };
  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {now.getHours() < 12 ? 'Good Morning ☀️' : now.getHours() < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙'}
          </h1>
          <p className="text-slate-500 text-sm">{userName}{userName && userAddress ? ' · ' : ''}{userAddress}</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenNotifications && (
            <button onClick={onOpenNotifications} className="relative p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
          )}
          <button onClick={onLogout} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
      {/* Out of Station Status Banner */}
      {outOfStation.active && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-red-700 text-sm">Out of Station</span>
            </div>
            <button onClick={handleCancelOos} className="text-xs text-red-500 underline">Cancel</button>
          </div>
          <p className="text-xs text-red-600 mb-3">{formatOosDates(outOfStation.selectedDates)}</p>
          {outOfStation.serviceDecisions.length === 0 ? (
            <p className="text-xs text-amber-700 font-medium">All services running normally.</p>
          ) : (
            <div className="space-y-2">
              {outOfStation.serviceDecisions.map(d => (
                <div key={d.subscriptionId} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-red-100">
                  <img src={d.visitorImage} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{d.serviceType}</p>
                    {d.action === 'alternate' && d.neighbourName ? (
                      <p className="text-[11px] text-blue-600 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />{d.neighbourName}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-600">Paused</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">Manage in the Schedule tab.</p>
        </motion.div>
      )}
      {/* OOS quick-action — only when not active */}
      {!outOfStation.active && onGoToSchedule && (
        <button
          onClick={onGoToSchedule}
          className="w-full flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
        >
          <span className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-4 h-4 text-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Out of Station</p>
            <p className="text-xs text-slate-500">Plan ahead — pause or redirect deliveries</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}
      {/* Upcoming Deliveries */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Today&apos;s Services</h2>
            <p className="text-xs text-slate-400">{now.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <Badge className="bg-blue-50 text-blue-600 border-0">{upcomingDeliveries.length} Services</Badge>
        </div>
        {upcomingDeliveries.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">No services today</h3>
            <p className="text-sm text-slate-500 mb-4">
              {mySubscriptions.length > 0
                ? 'Your other services are listed in the Schedule tab.'
                : 'Start by requesting a service'}
            </p>
            <div className="flex gap-2 justify-center">
              {mySubscriptions.length > 0 && onGoToSchedule && (
                <Button onClick={onGoToSchedule} variant="outline">View Schedule</Button>
              )}
              <Button onClick={() => onRequestService('New')} className="bg-blue-600 text-white">
                Request Service
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingDeliveries.map((delivery, index) => {
              const badge =
                delivery.status2 === 'completed' ? { text: 'Completed', cls: 'bg-green-100 text-green-700' }
                : delivery.status2 === 'delayed' ? { text: 'Delayed', cls: 'bg-red-100 text-red-700' }
                : delivery.status2 === 'pending' ? { text: delivery.arrived ? 'Arrived' : 'Pending', cls: 'bg-amber-100 text-amber-700' }
                : { text: 'Upcoming', cls: 'bg-blue-50 text-blue-600' };
              return (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all"
                >
                  <div onClick={() => handleSubscriptionClick(delivery)} className="cursor-pointer">
                    <div className="flex items-start gap-4">
                      <img src={delivery.visitorImage} alt={delivery.visitorName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-slate-900">{delivery.serviceType}</h3>
                            <p className="text-sm text-slate-600 mt-0.5">{delivery.visitorName}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                        </div>
                        {(() => {
                          if (!outOfStation.active) return null;
                          const d = outOfStation.serviceDecisions.find(x => x.subscriptionId === delivery.id);
                          if (!d) return null;
                          if (d.action === 'alternate' && d.neighbourName) return (
                            <div className="flex items-center gap-1.5 mb-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                              <ArrowRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="text-xs text-blue-700 font-medium">
                                → {d.neighbourName} · {d.neighbourPhone}
                              </span>
                            </div>
                          );
                          return (
                            <div className="flex items-center gap-1.5 mb-2 p-2 bg-red-50 rounded-lg border border-red-100">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              <span className="text-xs text-red-700 font-medium">Service paused — out of station</span>
                            </div>
                          );
                        })()}
                        {!outOfStation.active && (
                          <div className="flex flex-col gap-1.5 mt-2">
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                              <CalendarIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-green-700">
                                {delivery.details || delivery.serviceType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="text-sm font-semibold text-blue-700">
                                {delivery.visitTime} – {delivery.visitEndTime}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {/* Visitor Info Drawer */}
      <Drawer open={!!selectedSubscription} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-4 mb-4">
              <img src={selectedSubscription?.visitorImage} alt="" className="w-16 h-16 rounded-full object-cover" />
              <div className="flex-1">
                <DrawerTitle className="text-xl">{selectedSubscription?.visitorName}</DrawerTitle>
                <DrawerDescription>{selectedSubscription?.serviceType}</DrawerDescription>
              </div>
              <div className="flex gap-2">
                <button className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600" onClick={handleChatClick}>
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600" onClick={handleCallClick}>
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-1">
              <p>Schedule: <span className="font-semibold text-slate-900">{selectedSubscription?.schedule}</span></p>
              <p>Service Time: <span className="font-semibold text-slate-900">{selectedSubscription?.visitTime} – {selectedSubscription?.visitEndTime}</span></p>
              <p>Address: <span className="font-semibold text-slate-900">{selectedSubscription?.residentAddress}</span></p>
            </div>
          </div>
          <DrawerFooter className="pt-2">
            <Button variant="outline" onClick={closeDrawer}>Close</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
