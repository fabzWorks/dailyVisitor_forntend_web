import React from 'react';
import { Briefcase, ChevronRight, Clock, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { LiveSubscription } from '../../lib/api';
import type { DeliveryMap } from '../../lib/schedule';
import { ServiceDetailScreen } from './ServiceDetailScreen';

interface ResidentServicesProps {
  subscriptions: LiveSubscription[];
  deliveries: DeliveryMap;
  selected: LiveSubscription | null;        // the service whose attendance & payment screen is open
  onSelect: (subscription: LiveSubscription | null) => void;
  onRequestService: () => void;
}

// "Services" tab: all my services -> tap one -> attendance & payment details
export const ResidentServices: React.FC<ResidentServicesProps> = ({ subscriptions, deliveries, selected, onSelect, onRequestService }) => {
  if (selected) {
    return <ServiceDetailScreen subscription={selected} deliveries={deliveries} onBack={() => onSelect(null)} />;
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500 text-sm">Tap a service to see attendance and payment details</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-7 h-7 text-blue-300" />
          </div>
          <p className="font-bold text-slate-900">No services yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">Request a service and it will appear here once the provider accepts.</p>
          <button
            onClick={onRequestService}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4" /> Request a service
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub, i) => (
            <motion.button
              key={sub.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              onClick={() => onSelect(sub)}
              className="w-full text-left flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <img src={sub.visitorImage} alt={sub.visitorName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm truncate">{sub.serviceType}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    sub.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate">{sub.visitorName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {sub.schedule} · {sub.visitTime} – {sub.visitEndTime}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
