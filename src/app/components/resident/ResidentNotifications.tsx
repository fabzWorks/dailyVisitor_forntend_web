import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Bell, Phone, Truck, Send, Loader2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import type { AppNotification } from '../../lib/api';
import { api, avatarFor, timeAgoFrom, to12h } from '../../lib/api';
interface ResidentNotificationsProps {
  notifications: AppNotification[];
  userId: number;
  onBack: () => void;
  onOpened?: () => void;
  onNoteSent?: () => void;
}
// "Provider arrived" card: the resident can add an extra note for the provider (optional).
// The provider can only VIEW the note.
const ArrivedCard: React.FC<{ notif: AppNotification; userId: number; onNoteSent?: () => void }> = ({ notif, userId, onNoteSent }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const req = notif.request;
  const sent = !!notif.note;
  const send = async () => {
    if (!text.trim() || !notif.deliveryId) return;
    setSending(true);
    try {
      await api(`/api/deliveries/${notif.deliveryId}/note`, { body: { residentId: userId, note: text.trim() } });
      toast.success('Note sent to ' + (req?.provider.name ?? 'provider'));
      setText('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
      onNoteSent?.();
    }
  };
  return (
    <div className="bg-white rounded-2xl border-l-4 border-l-orange-500 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-100"><Truck className="w-4 h-4 text-orange-600" /></div>
          <span className="font-semibold text-sm text-orange-800">Provider Arrived</span>
          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <span className="text-[10px] text-slate-400">{timeAgoFrom(notif.createdAt)}</span>
      </div>
      {req && (
        <div className="flex items-center gap-2.5 mb-2">
          <img src={avatarFor(req.provider.name)} alt={req.provider.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{req.provider.name}</p>
            <p className="text-xs text-slate-500">{req.serviceLabel}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{notif.message}</p>
      {sent ? (
        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
          <p className="text-[11px] font-bold text-green-700 flex items-center gap-1 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Your note was sent</p>
          <p className="text-xs text-slate-700">{notif.note}</p>
        </div>
      ) : (
        <div className="mt-3">
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1.5">
            <StickyNote className="w-3.5 h-3.5 text-orange-500" /> Additional note for {req?.provider.name.split(' ')[0] ?? 'the provider'} <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Please ring the bell twice, need 1 extra litre today..."
            className="w-full text-sm p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            OK
          </button>
        </div>
      )}
    </div>
  );
};

// "Service done" card
const DoneCard: React.FC<{ notif: AppNotification }> = ({ notif }) => {
  const req = notif.request;
  return (
    <div className="bg-white rounded-2xl border-l-4 border-l-green-500 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-100"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
          <span className="font-semibold text-sm text-green-800">Service Done</span>
          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <span className="text-[10px] text-slate-400">{timeAgoFrom(notif.createdAt)}</span>
      </div>
      {req && (
        <div className="flex items-center gap-2.5 mb-2">
          <img src={avatarFor(req.provider.name)} alt={req.provider.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{req.provider.name}</p>
            <p className="text-xs text-slate-500">{req.serviceLabel}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{notif.message}</p>
    </div>
  );
};
export const ResidentNotifications: React.FC<ResidentNotificationsProps> = ({ notifications, userId, onBack, onOpened, onNoteSent }) => {
  // opening the screen marks everything as read
  useEffect(() => { onOpened?.(); /* eslint-disable-next-line */ }, []);
  const unread = notifications.filter(n => !n.isRead).length;
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
        {unread > 0 && (
          <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {unread} new
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {/* Live notifications (nothing is stored, each one disappears after 24 hours) */}
        {notifications.map((notif, i) => {
          if (notif.type === 'provider_arrived' || notif.type === 'service_done') {
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                {notif.type === 'provider_arrived'
                  ? <ArrivedCard notif={notif} userId={userId} onNoteSent={onNoteSent} />
                  : <DoneCard notif={notif} />}
              </motion.div>
            );
          }
          const accepted = notif.type === 'request_accepted';
          const req = notif.request;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={`bg-white rounded-2xl border-l-4 shadow-sm p-4 ${accepted ? 'border-l-green-500' : 'border-l-red-400'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${accepted ? 'bg-green-100' : 'bg-red-100'}`}>
                      {accepted
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <span className={`font-semibold text-sm ${accepted ? 'text-green-800' : 'text-red-700'}`}>
                      {accepted ? 'Service Accepted' : 'Service Rejected'}
                    </span>
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="text-[10px] text-slate-400">{timeAgoFrom(notif.createdAt)}</span>
                </div>
                {req && (
                  <div className="flex items-center gap-2.5 mb-2">
                    <img src={avatarFor(req.provider.name)} alt={req.provider.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{req.provider.name}</p>
                      <p className="text-xs text-slate-500">{req.serviceLabel}</p>
                    </div>
                    {req.provider.contact && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><Phone className="w-3 h-3" />{req.provider.contact}</span>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{notif.message}</p>
                {accepted && req && req.groups.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {req.groups.map((g, gi) => (
                      <div key={gi} className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="font-medium text-slate-700">{g.days.join(', ')}</span>
                        <span>{to12h(g.from)} – {to12h(g.to)}</span>
                        {g.details && <span className="text-slate-400 truncate">· {g.details}</span>}
                      </div>
                    ))}
                    <p className="text-[11px] text-green-700 font-medium pt-1">Added to your schedule ✓</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No notifications</p>
            <p className="text-sm text-slate-400">Updates about your services appear here and disappear after one day.</p>
          </div>
        )}
      </div>
    </div>
  );
};
