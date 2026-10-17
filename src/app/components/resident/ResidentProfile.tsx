import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, MapPin, Phone, Plus, Trash2, Edit3, ChevronRight,
  LogOut, CheckCircle2, X, Home, Shield, Star, Users,
} from 'lucide-react';
import { Button } from '../ui/common';
import type { Neighbour } from '../../data/shared/types';
import type { SessionUser } from '../../lib/api';
interface ResidentProfileProps {
  user: SessionUser;            // the logged-in resident (real data from the database)
  activeServices: number;       // how many accepted services he has
  neighbours: Neighbour[];
  onNeighboursChange: (neighbours: Neighbour[]) => void;
  onLogout: () => void;
  openAddAlternate?: boolean;
  onOpenAddAlternateDone?: () => void;
}
type ProfileStep = 'main' | 'add-neighbour' | 'edit-neighbour';
export const ResidentProfile: React.FC<ResidentProfileProps> = ({
  user,
  activeServices,
  neighbours,
  onNeighboursChange,
  onLogout,
  openAddAlternate,
  onOpenAddAlternateDone,
}) => {
  const [step, setStep] = useState<ProfileStep>('main');
  const [editTarget, setEditTarget] = useState<Neighbour | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'neighbours'>('profile');
  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (openAddAlternate) {
      setActiveTab('neighbours');
      setFormName('');
      setFormPhone('');
      setFormAddress('');
      setFormLocation('');
      setFormErrors({});
      setEditTarget(null);
      setStep('add-neighbour');
      onOpenAddAlternateDone?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddAlternate]);
  const profile = { id: `R-${user.id}`, name: user.name, address: user.address || 'Address not added' };
  const openAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormLocation('');
    setFormErrors({});
    setEditTarget(null);
    setStep('add-neighbour');
  };
  const openEdit = (nb: Neighbour) => {
    setFormName(nb.name);
    setFormPhone(nb.phone);
    setFormAddress(nb.address);
    setFormLocation(nb.location);
    setFormErrors({});
    setEditTarget(nb);
    setStep('edit-neighbour');
  };
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = 'Name is required';
    if (!formPhone.trim()) errs.phone = 'Phone number is required';
    if (!formAddress.trim()) errs.address = 'Address is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSaveNeighbour = () => {
    if (!validate()) return;
    const newNb: Neighbour = {
      id: editTarget?.id ?? `nb-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      location: formLocation.trim() || formAddress.trim(),
    };
    if (editTarget) {
      onNeighboursChange(neighbours.map(n => n.id === editTarget.id ? newNb : n));
    } else {
      onNeighboursChange([...neighbours, newNb]);
    }
    setStep('main');
  };
  const handleDeleteNeighbour = (id: string) => {
    onNeighboursChange(neighbours.filter(n => n.id !== id));
  };
  // ─── ADD / EDIT FORM ────────────────────────────────────────────────────
  if (step === 'add-neighbour' || step === 'edit-neighbour') {
    const isEdit = step === 'edit-neighbour';
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm sticky top-0 z-20">
          <button
            onClick={() => setStep('main')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Alternate' : 'Add Alternate'}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 flex items-start gap-3">
            <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Saved alternates can receive your deliveries when you are out of station.
              They will be shown as quick-pick options in the Out of Station flow.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Neighbour full name"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Phone Number *</label>
            <input
              type="tel"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              placeholder="03XX-XXXXXXX"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {formErrors.phone && <p className="text-xs text-red-600">{formErrors.phone}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Full Address *</label>
            <textarea
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
              placeholder="House number, street, area, city"
              rows={3}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            {formErrors.address && <p className="text-xs text-red-600">{formErrors.address}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Location Label <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={formLocation}
              onChange={e => setFormLocation(e.target.value)}
              placeholder="e.g. Next door, Two doors down"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-slate-400">A short label shown in delivery cards</p>
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0">
          <Button
            onClick={handleSaveNeighbour}
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {isEdit ? 'Save Changes' : 'Add Alternate'}
          </Button>
        </div>
      </div>
    );
  }
  // ─── MAIN PROFILE ────────────────────────────────────────────────────────
  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 pt-10 pb-5 px-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] bg-white/20 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/30 flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
            <div className="flex items-start gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-blue-200 flex-shrink-0 mt-0.5" />
              <p className="text-blue-200 text-xs leading-snug">{profile.address}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-semibold text-white flex items-center gap-1">
                <Shield className="w-3 h-3" /> Resident
              </span>
              <span className="px-2 py-0.5 bg-green-400/30 rounded-full text-[10px] font-semibold text-green-200">
                Verified
              </span>
            </div>
          </div>
        </div>
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Member ID', value: profile.id.toUpperCase() },
            { label: 'Alternates', value: `${neighbours.length}` },
            { label: 'Services', value: `${activeServices} Active` },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-sm">{stat.value}</p>
              <p className="text-blue-200 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1">
          {(['profile', 'neighbours'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === t
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              {t === 'neighbours' ? `Alternates (${neighbours.length})` : 'Profile'}
            </button>
          ))}
        </div>
      </div>
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'profile' ? (
          <div className="p-5 space-y-5 pb-24">
            {/* Account Settings */}
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-3">Account</h2>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {[
                  { icon: User, label: 'Edit Profile', sub: 'Update name and address', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: Shield, label: 'Privacy & Security', sub: 'Manage your account security', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { icon: Star, label: 'Rate Our App', sub: 'Share your feedback', color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((item, i) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left ${i < 2 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <item.icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Sign Out
            </button>
            <p className="text-center text-xs text-slate-400">Smart Visitor Management v1.0</p>
          </div>
        ) : (
          <div className="p-5 space-y-4 pb-24">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Alternates</h2>
                <p className="text-xs text-slate-500 mt-0.5">Receive your deliveries when you are out of station</p>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New
              </button>
            </div>
            {neighbours.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-white rounded-2xl border border-slate-100 text-center"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Home className="w-7 h-7 text-blue-300" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">No Alternates Added</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Add alternates so they can receive your deliveries when you are away
                </p>
                <button
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Your First Alternate
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {neighbours.map((nb, i) => (
                    <motion.div
                      key={nb.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">
                            {nb.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{nb.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{nb.phone}</span>
                          </div>
                          <div className="flex items-start gap-1.5 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-slate-500 leading-snug">{nb.address}</span>
                          </div>
                          {nb.location && nb.location !== nb.address && (
                            <span className="mt-1.5 inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-lg">
                              {nb.location}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => openEdit(nb)}
                            className="w-8 h-8 bg-slate-100 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteNeighbour(nb.id)}
                            className="w-8 h-8 bg-slate-100 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
