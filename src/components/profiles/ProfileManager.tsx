import React, { useState } from 'react';
import { User, Profile, ProfileType, CustomField } from '../../types';
import { getProfiles, saveProfile, deleteProfile } from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  User as UserIcon,
  Briefcase,
  Users,
  Building,
  Plus,
  Trash2,
  Check,
  Star,
  Sparkles,
  Save,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface ProfileManagerProps {
  currentUser: User;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>(() => getProfiles(currentUser.id));
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    const list = getProfiles(currentUser.id);
    return list.find((p) => p.isDefault)?.id || list[0]?.id || '';
  });

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const [formData, setFormData] = useState<Profile | null>(activeProfile || null);
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customVal, setCustomVal] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync when active profile changes
  const handleSelectProfile = (p: Profile) => {
    setSelectedProfileId(p.id);
    setFormData(JSON.parse(JSON.stringify(p)));
  };

  const handleCreateNew = (type: ProfileType = 'personal') => {
    const typeTitles: Record<ProfileType, string> = {
      personal: 'Personal Profile',
      business: 'Business / Corporate Profile',
      family: 'Family Member Profile',
      customer: 'Client / Customer Profile',
      custom: 'Custom Profile',
    };

    const newProf: Profile = {
      id: `prof_${Date.now()}`,
      userId: currentUser.id,
      name: typeTitles[type],
      type,
      isDefault: profiles.length === 0,
      data: {
        fullName: type === 'personal' ? currentUser.name : '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
        email: type === 'personal' ? currentUser.email : '',
        address: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'United States',
        postalCode: '',
        company: currentUser.organization || '',
        jobTitle: '',
        department: '',
        taxId: '',
        nationalId: '',
        website: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        notes: '',
        customFields: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProfile(newProf);
    const updated = getProfiles(currentUser.id);
    setProfiles(updated);
    setSelectedProfileId(newProf.id);
    setFormData(newProf);
    showToast('New Profile Created', `Configuring "${newProf.name}"`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    saveProfile(formData);
    const updated = getProfiles(currentUser.id);
    setProfiles(updated);
    showToast('Profile Saved', `Updated "${formData.name}" information`);
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    const updated = getProfiles(currentUser.id);
    setProfiles(updated);
    if (selectedProfileId === id) {
      const next = updated[0];
      setSelectedProfileId(next ? next.id : '');
      setFormData(next ? JSON.parse(JSON.stringify(next)) : null);
    }
    setDeleteConfirmId(null);
    showToast('Profile Deleted', 'The profile was permanently removed');
  };

  const handleAddCustomField = () => {
    if (!formData || !customLabel.trim() || !customVal.trim()) return;
    const cleanKey = customKey.trim() || customLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const newField: CustomField = {
      id: `cf_${Date.now()}`,
      key: cleanKey,
      label: customLabel.trim(),
      value: customVal.trim(),
    };

    const updated: Profile = {
      ...formData,
      data: {
        ...formData.data,
        customFields: [...(formData.data.customFields || []), newField],
      },
    };
    setFormData(updated);
    setCustomKey('');
    setCustomLabel('');
    setCustomVal('');
  };

  const handleRemoveCustomField = (cfId: string) => {
    if (!formData) return;
    const updated: Profile = {
      ...formData,
      data: {
        ...formData.data,
        customFields: formData.data.customFields.filter((cf) => cf.id !== cfId),
      },
    };
    setFormData(updated);
  };

  const getTypeIcon = (type: ProfileType) => {
    switch (type) {
      case 'personal':
        return <UserIcon className="w-3.5 h-3.5 text-blue-600" />;
      case 'business':
        return <Briefcase className="w-3.5 h-3.5 text-amber-600" />;
      case 'family':
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case 'customer':
        return <Building className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-neutral-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Reusable Data Profiles</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Store personal, business, family, and customer records once — autofill them anywhere with 1-click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Profile
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-20 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 p-1.5 text-xs">
              <button
                onClick={() => handleCreateNew('personal')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 text-neutral-800 flex items-center gap-2"
              >
                <UserIcon className="w-3.5 h-3.5 text-blue-600" /> Personal
              </button>
              <button
                onClick={() => handleCreateNew('business')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 text-neutral-800 flex items-center gap-2"
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Business / Work
              </button>
              <button
                onClick={() => handleCreateNew('family')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 text-neutral-800 flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" /> Family Member
              </button>
              <button
                onClick={() => handleCreateNew('customer')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 text-neutral-800 flex items-center gap-2"
              >
                <Building className="w-3.5 h-3.5 text-purple-600" /> Client / Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profiles List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
            Your Profiles ({profiles.length})
          </div>

          <div className="space-y-1.5">
            {profiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-md ${isSelected ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                        {getTypeIcon(p.type)}
                      </span>
                      <span className="font-semibold text-xs truncate max-w-[170px]">{p.name}</span>
                    </div>
                    {p.isDefault && (
                      <span
                        className={`text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-neutral-800 text-amber-300' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <Star className="w-2.5 h-2.5 fill-current" /> Default
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {p.data.fullName || 'No name set'} {p.data.company ? `· ${p.data.company}` : ''}
                  </div>
                </div>
              );
            })}

            {profiles.length === 0 && (
              <div className="p-6 text-center border border-dashed border-neutral-300 rounded-xl bg-neutral-50 text-xs text-neutral-500">
                No profiles saved yet. Click "+ New Profile" above to create one.
              </div>
            )}
          </div>

          {/* Quick info tip */}
          <div className="p-3.5 bg-neutral-100/70 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1 mt-4">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Isolated & Client-Side Secure
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Profiles are isolated strictly to your account (<span className="font-mono text-neutral-700">{currentUser.email}</span>). No cross-user access is ever granted.
            </p>
          </div>
        </div>

        {/* Right Column: Profile Editor */}
        <div className="lg:col-span-8">
          {formData ? (
            <form onSubmit={handleSave} className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-6">
              {/* Profile Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Profile Label
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-base font-bold text-neutral-900 border-b border-neutral-300 focus:border-neutral-900 focus:outline-none w-full py-0.5"
                    placeholder="Profile Name"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>Default Profile</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(formData.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section 1: Identity & Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    1. Identity & Personal Contact
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={formData.data.fullName}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, fullName: e.target.value } })}
                      placeholder="Full legal name"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.data.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, dateOfBirth: e.target.value } })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Primary Email</label>
                    <input
                      type="email"
                      value={formData.data.email}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, email: e.target.value } })}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.data.phone}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, phone: e.target.value } })}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Gender / Pronouns</label>
                    <input
                      type="text"
                      value={formData.data.gender}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, gender: e.target.value } })}
                      placeholder="Pronouns / Gender"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Tax ID / SSN / EIN (Obfuscated)</label>
                    <input
                      type="text"
                      value={formData.data.taxId}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, taxId: e.target.value } })}
                      placeholder="Tax ID or SSN"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Address */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    2. Address & Location
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-neutral-700 block mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.data.address}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, address: e.target.value } })}
                      placeholder="Street address, suite/apt"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={formData.data.city}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, city: e.target.value } })}
                      placeholder="City"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">State / Province</label>
                    <input
                      type="text"
                      value={formData.data.state}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, state: e.target.value } })}
                      placeholder="State or Province"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Postal / Zip Code</label>
                    <input
                      type="text"
                      value={formData.data.postalCode}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, postalCode: e.target.value } })}
                      placeholder="Postal code"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.data.country}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, country: e.target.value } })}
                      placeholder="Country"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Professional / Organization */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    3. Corporate / Employment Details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={formData.data.company}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, company: e.target.value } })}
                      placeholder="Company or organization"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Job Title / Designation</label>
                    <input
                      type="text"
                      value={formData.data.jobTitle}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, jobTitle: e.target.value } })}
                      placeholder="Job title"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.data.department}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, department: e.target.value } })}
                      placeholder="Department"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Website URL</label>
                    <input
                      type="url"
                      value={formData.data.website}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, website: e.target.value } })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Emergency Contacts & Notes */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    4. Emergency Contact & Notes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={formData.data.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, emergencyContactName: e.target.value } })}
                      placeholder="Emergency contact full name"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.data.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, emergencyContactPhone: e.target.value } })}
                      placeholder="Emergency contact phone"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-neutral-700 block mb-1">General Notes / Instructions</label>
                    <textarea
                      rows={2}
                      value={formData.data.notes}
                      onChange={(e) => setFormData({ ...formData, data: { ...formData.data, notes: e.target.value } })}
                      placeholder="Add any specific context or billing references..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Custom Custom Fields */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      5. Custom Autofill Attributes
                    </span>
                    <span className="text-neutral-400" title="Custom fields allow mapping non-standard form items like badge numbers, shirt sizes, or license keys">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {formData.data.customFields && formData.data.customFields.length > 0 && (
                  <div className="space-y-1.5">
                    {formData.data.customFields.map((cf) => (
                      <div
                        key={cf.id}
                        className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-neutral-800">{cf.label}</span>
                          <span className="font-mono text-neutral-400 text-[11px]">({cf.key})</span>
                          <span className="text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200 font-mono text-[11px]">
                            {cf.value}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(cf.id)}
                          className="text-neutral-400 hover:text-red-600 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add custom field row */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Passport No.)"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Key tag (optional, e.g. passport)"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Field value"
                      value={customVal}
                      onChange={(e) => setCustomVal(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    disabled={!customLabel.trim() || !customVal.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Custom Attribute
                  </button>
                </div>
              </div>

              {/* Submit actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Profile Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
              <UserIcon className="w-10 h-10 text-neutral-300 mx-auto" />
              <h3 className="text-sm font-semibold text-neutral-800">No profile selected</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Select an existing profile on the left or click "+ New Profile" to configure a new set of reusable autofill information.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Profile Deletion */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Delete Profile?</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to permanently remove this profile? Forms already filled with this data will remain unaffected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
