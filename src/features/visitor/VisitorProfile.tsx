import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone, Plus, Trash2, Edit3, ChevronRight,
  LogOut, CheckCircle2, X, Briefcase, Shield, Star,
  Users, UserPlus, MapPin,
} from 'lucide-react';
import { Button } from '@/components/atoms';
import type { VisitorAlternate } from '@/types/domain';
import { avatarFor } from '@/lib/format';
import type { SessionUser } from '@/api/types';
interface VisitorProfileProps {
  user: SessionUser;            // the logged-in provider (real data from the database)
  serviceLabel: string;         // e.g. "Milkman"
  jobsDone: number;             // how many services he has marked as "done"
  alternates: VisitorAlternate[];
  onAlternatesChange: (alternates: VisitorAlternate[]) => void;
  onLogout: () => void;
  openAddAlternate?: boolean;
  onOpenAddAlternateDone?: () => void;
}
type ProfileStep = 'main' | 'add-alternate' | 'edit-alternate';
export const VisitorProfile: React.FC<VisitorProfileProps> = ({
  user,
  serviceLabel,
  jobsDone,
  alternates,
  onAlternatesChange,
  onLogout,
  openAddAlternate,
  onOpenAddAlternateDone,
}) => {
  const [step, setStep] = useState<ProfileStep>('main');
  const [editTarget, setEditTarget] = useState<VisitorAlternate | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'alternatives'>('profile');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProfession, setFormProfession] = useState('');
  const [formRelationship, setFormRelationship] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const profile = { id: `V-${user.id}`, name: user.name, profession: serviceLabel, imageUrl: avatarFor(user.name), totalJobs: jobsDone };
  useEffect(() => {
    if (openAddAlternate) {
      setActiveTab('alternatives');
      setFormName('');
      setFormPhone('');
      setFormProfession(profile.profession);
      setFormRelationship('');
      setFormErrors({});
      setEditTarget(null);
      setStep('add-alternate');
      onOpenAddAlternateDone?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddAlternate]);
  const openAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormProfession(profile.profession);
    setFormRelationship('');
    setFormErrors({});
    setEditTarget(null);
    setStep('add-alternate');
  };
  const openEdit = (alt: VisitorAlternate) => {
    setFormName(alt.name);
    setFormPhone(alt.phone);
    setFormProfession(alt.profession);
    setFormRelationship(alt.relationship);
    setFormErrors({});
    setEditTarget(alt);
    setStep('edit-alternate');
  };
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = 'Name is required';
    if (!formPhone.trim()) errs.phone = 'Phone number is required';
    if (!formProfession.trim()) errs.profession = 'Profession is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSaveAlternate = () => {
    if (!validate()) return;
    const newAlt: VisitorAlternate = {
      id: editTarget?.id ?? `va-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      profession: formProfession.trim(),
      relationship: formRelationship.trim() || 'Colleague',
    };
    if (editTarget) {
      onAlternatesChange(alternates.map(a => a.id === editTarget.id ? newAlt : a));
    } else {
      onAlternatesChange([...alternates, newAlt]);
    }
    setStep('main');
  };
  const handleDelete = (id: string) => {
    onAlternatesChange(alternates.filter(a => a.id !== id));
  };
  const relationshipOptions = ['Family', 'Colleague', 'Friend', 'Partner'];
  // ─── ADD / EDIT FORM ────────────────────────────────────────────────────
  if (step === 'add-alternate' || step === 'edit-alternate') {
    const isEdit = step === 'edit-alternate';
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
            {isEdit ? 'Edit Alternative' : 'Add Alternative'}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="bg-teal-50 rounded-2xl border border-teal-100 p-4 flex items-start gap-3">
            <Users className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700 leading-relaxed">
              An alternative is someone who can cover your jobs when you are unavailable.
              Residents will see their name and contact when you are out of station.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Kamran Ali"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
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
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {formErrors.phone && <p className="text-xs text-red-600">{formErrors.phone}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Profession / Service *</label>
            <input
              type="text"
              value={formProfession}
              onChange={e => setFormProfession(e.target.value)}
              placeholder="e.g. Milk Delivery"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {formErrors.profession && <p className="text-xs text-red-600">{formErrors.profession}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Relationship</label>
            <div className="flex flex-wrap gap-2">
              {relationshipOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormRelationship(opt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    formRelationship === opt
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formRelationship}
              onChange={e => setFormRelationship(e.target.value)}
              placeholder="Or type custom..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0">
          <Button
            onClick={handleSaveAlternate}
            className="w-full h-12 text-base bg-teal-600 hover:bg-teal-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {isEdit ? 'Save Changes' : 'Add Alternative'}
          </Button>
        </div>
      </div>
    );
  }
  // ─── MAIN PROFILE ────────────────────────────────────────────────────────
  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 pt-10 pb-5 px-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/30 flex-shrink-0">
            <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Briefcase className="w-3.5 h-3.5 text-teal-200" />
              <p className="text-teal-200 text-xs">{profile.profession}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-semibold text-white flex items-center gap-1">
                <Shield className="w-3 h-3" /> Visitor
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Visitor ID', value: profile.id.toUpperCase() },
            { label: 'Jobs Done', value: `${profile.totalJobs}` },
            { label: 'Alternatives', value: `${alternates.length}` },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-sm">{stat.value}</p>
              <p className="text-teal-200 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1">
          {(['profile', 'alternatives'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === t
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              {t === 'alternatives' ? `Alternatives (${alternates.length})` : 'Profile'}
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
                  { icon: Briefcase, label: 'Edit Profile', sub: 'Update name and profession', bg: 'bg-teal-50' },
                  { icon: Shield, label: 'Privacy & Security', sub: 'Manage your account security', bg: 'bg-purple-50' },
                  { icon: Star, label: 'Rate Our App', sub: 'Share your feedback', bg: 'bg-amber-50' },
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
                <h2 className="text-base font-bold text-slate-900">My Alternatives</h2>
                <p className="text-xs text-slate-500 mt-0.5">Cover your jobs when you are unavailable</p>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New
              </button>
            </div>
            {alternates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-white rounded-2xl border border-slate-100 text-center"
              >
                <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-7 h-7 text-teal-300" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">No Alternatives Added</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Add someone who can cover your jobs when you are out of station
                </p>
                <button
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Your First Alternative
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {alternates.map((alt, i) => (
                    <motion.div
                      key={alt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-teal-600">
                            {alt.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{alt.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{alt.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-lg">
                              {alt.profession}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-lg">
                              {alt.relationship}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => openEdit(alt)}
                            className="w-8 h-8 bg-slate-100 hover:bg-teal-100 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(alt.id)}
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
