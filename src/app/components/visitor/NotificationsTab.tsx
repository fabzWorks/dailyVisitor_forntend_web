import React from 'react';
import { ArrowLeft, BellRing, Clock, MapPin, X, Check, AlertTriangle, CheckCircle2, XCircle, Phone, Loader2, Banknote, StickyNote } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppNotification } from '../../lib/api';
import { timeAgoFrom, to12h, money } from '../../lib/api';
interface VisitorNotificationsProps {
  onBack: () => void;
  notifications: AppNotification[];
  respondingId: number | null;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}
export const VisitorNotifications: React.FC<VisitorNotificationsProps> = ({
  onBack, notifications, respondingId, onAccept, onReject,
}) => {
  const requests = notifications.filter(n => n.type === 'new_request' && n.request);
  const pendingCount = requests.filter(n => n.request!.status === 'pending').length;
  // notes that residents wrote for an upcoming delivery
  const notes = notifications.filter(n => n.type === 'resident_note' && n.note);
  const newNotes = notes.filter(n => !n.isRead).length;
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
        {pendingCount + newNotes > 0 && (
          <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount + newNotes} new
          </span>
        )}
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-24">
        {/* Notes from residents about today's delivery */}
        {notes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes from residents</h3>
            {notes.map((n, i) => (
              <motion.div key={n.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <div className="bg-white rounded-2xl border-l-4 border-l-amber-500 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600"><StickyNote className="w-4 h-4" /></div>
                      <span className="font-semibold text-sm text-slate-900">Note from {n.request?.resident.name ?? 'resident'}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{timeAgoFrom(n.createdAt)}</span>
                  </div>
                  {n.request && <p className="text-xs text-slate-500 mb-2">{n.request.serviceLabel}{n.request.resident.address ? ' · ' + n.request.resident.address : ''}</p>}
                  <p className="text-sm text-slate-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">{n.note}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {/* Service requests from residents (live from the database) */}
        {requests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Requests</h3>
            {requests.map((n, i) => {
              const req = n.request!;
              const pending = req.status === 'pending';
              const busy = respondingId === req.id;
              return (
                <motion.div key={n.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <div className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden ${
                    pending ? 'border-l-blue-500' : req.status === 'accepted' ? 'border-l-green-500' : 'border-l-red-400'}`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${pending ? 'bg-blue-100 text-blue-600' : req.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {pending ? <BellRing className="w-4 h-4" /> : req.status === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <span className="font-semibold text-sm text-slate-900">
                            {pending ? 'New Service Request' : req.status === 'accepted' ? 'You accepted this request' : 'You rejected this request'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{timeAgoFrom(n.createdAt)}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mb-0.5">{req.serviceLabel}</h3>
                      <p className="text-slate-500 text-sm">From: {req.resident.name}</p>
                      {req.resident.address && <p className="text-slate-400 text-xs mb-0.5">{req.resident.address}</p>}
                      {req.resident.contact && (
                        <p className="text-slate-500 text-xs mb-3 flex items-center gap-1"><Phone className="w-3 h-3" />{req.resident.contact}</p>
                      )}
                      <div className="space-y-1.5 mb-3 mt-2">
                        {req.groups.map((g, gi) => (
                          <div key={gi} className="bg-slate-50 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold">{g.days.join(', ')}</span>
                              <span className="ml-auto">{to12h(g.from)} – {to12h(g.to)}</span>
                            </div>
                            {g.details && <p className="text-xs text-slate-500 mt-1 pl-5">{g.details}</p>}
                          </div>
                        ))}
                      </div>
                      {req.notes && <p className="text-xs text-slate-500 italic mb-3">“{req.notes}”</p>}
                      <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 mb-4 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-700">
                          Starts {new Date(req.startDate + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {req.total > 0 && (
                          <p className="ml-auto text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5" />{money(req.total)} / 30 days
                          </p>
                        )}
                      </div>
                      {pending ? (
                        <div className="flex gap-3">
                          <button
                            disabled={busy}
                            onClick={() => onReject(req.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => onAccept(req.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Accept
                          </button>
                        </div>
                      ) : (
                        <p className={`text-xs font-semibold text-center py-2 rounded-xl ${req.status === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {req.status === 'accepted' ? 'Accepted — added to your schedule ✓' : 'Rejected'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {requests.length === 0 && notes.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <BellRing className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No notifications</p>
            <p className="text-sm text-slate-400">New requests and resident notes appear here and disappear after one day.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
