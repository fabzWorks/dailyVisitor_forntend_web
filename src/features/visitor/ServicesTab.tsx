import React, { useState } from 'react';
import { Card, Badge } from '@/components/atoms';
import { Briefcase, ChevronRight, Home, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { ResidentRecordDetail } from '@/features/visitor/ResidentRecordDetail';
import type { LiveSubscription } from '@/lib/mappers';
import type { DeliveryMap } from '@/lib/schedule';
interface VisitorServicesProps {
  subscriptions: LiveSubscription[];   // this provider's accepted services (real, from the database)
  deliveries: DeliveryMap;
  serviceLabel: string;                // e.g. "Milkman"
}
export const VisitorServices: React.FC<VisitorServicesProps> = ({ subscriptions, deliveries, serviceLabel }) => {
  const [selectedResident, setSelectedResident] = useState<LiveSubscription | null>(null);
  const service = serviceLabel;
  // All active households of this provider
  const assignedHouseholds = subscriptions.filter(s => s.status === 'Active');
  if (selectedResident) {
    return <ResidentRecordDetail subscription={selectedResident} deliveries={deliveries} onBack={() => setSelectedResident(null)} />;
  }
  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Subscription</h1>
      <p className="text-slate-500 text-sm mb-6">You are subscribed to {service} service.</p>
      <div className="space-y-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-0 overflow-hidden border-0 shadow-xl shadow-blue-900/5 bg-white">
            <div className="bg-slate-900 p-6 text-white">
               <div className="flex items-start justify-between">
                 <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {service}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">Active Subscription</p>
                 </div>
                 <div className="p-2 bg-white/10 rounded-lg">
                    <Briefcase className="w-6 h-6 text-white" />
                 </div>
               </div>
               <div className="mt-6 flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-1.5">
                     <Clock className="w-4 h-4" />
                     <span>Daily Schedule</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <Home className="w-4 h-4" />
                     <span>{assignedHouseholds.length} Households</span>
                  </div>
               </div>
            </div>
            <div className="p-0">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Households</h3>
               </div>
               <div className="divide-y divide-slate-100">
                 {assignedHouseholds.length > 0 ? (
                    assignedHouseholds.map((household, index) => (
                       <motion.div 
                         key={household.id} 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: index * 0.05 }}
                         onClick={() => setSelectedResident(household)}
                         className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                       >
                          <div className="flex items-start gap-3">
                             <div className="p-2 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <Home className="w-4 h-4" />
                             </div>
                             <div>
                                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{household.residentName}</h4>
                                <p className="text-xs text-slate-500">{household.residentAddress}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 font-mono text-xs">
                               {household.visitTime}
                            </Badge>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </div>
                       </motion.div>
                    ))
                 ) : (
                    <div className="p-8 text-center">
                       <p className="text-slate-400 text-sm">No active households assigned.</p>
                    </div>
                 )}
               </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
