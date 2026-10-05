import React, { useState, useMemo } from 'react';
import { User, CapturedWebForm, CapturedWebField, Form, ProfileType } from '../../types';
import {
  getCapturedForms,
  saveCapturedForm,
  deleteCapturedForm,
  convertCapturedToForm,
  getProfiles,
} from '../../services/storage';
import { downloadExtensionZip, generateExtensionFiles } from '../../services/extensionPackage';
import {
  extractBrowserFormContext,
  executeAutomatedProfileMatch,
  findAutomatedMatchCandidate,
} from '../../services/formContextHelper';
import { ClippingHelper } from './ClippingHelper';
import { useToast } from '../common/Toast';
import {
  Download,
  Globe,
  Sparkles,
  CheckCircle2,
  Trash2,
  Code,
  ArrowRight,
  ShieldCheck,
  Play,
  RotateCcw,
  Zap,
  Tag,
  Check,
  X,
  Layers,
  Settings,
  Info,
} from 'lucide-react';

interface ExtensionHubProps {
  currentUser: User;
  onOpenFormInBuilder: (form: Form) => void;
}

interface SimulatedSite {
  domain: string;
  name: string;
  url: string;
  title: string;
  method: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
    autofillKey?: string;
  }>;
}

const PRESET_SITES: SimulatedSite[] = [
  {
    domain: 'boards.greenhouse.io',
    name: 'Greenhouse Career Portal',
    url: 'https://boards.greenhouse.io/careers/job-application',
    title: 'Senior Engineering Role - Online Application',
    method: 'POST',
    fields: [
      { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true, autofillKey: 'firstName' },
      { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true, autofillKey: 'lastName' },
      { name: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter email address', required: true, autofillKey: 'email' },
      { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'Enter phone number', required: true, autofillKey: 'phone' },
      { name: 'location', label: 'Current City & State', type: 'text', placeholder: 'City, State', autofillKey: 'city' },
      { name: 'linkedin', label: 'LinkedIn Profile URL', type: 'url', placeholder: 'https://linkedin.com/in/...', autofillKey: 'website' },
      { name: 'notes', label: 'Why are you a fit for this role?', type: 'textarea', placeholder: 'Summary of background...', autofillKey: 'notes' },
    ],
  },
  {
    domain: 'checkout.shopify.com',
    name: 'Shopify Express Checkout',
    url: 'https://checkout.shopify.com/orders/express-billing',
    title: 'Secure Express Checkout & Shipping',
    method: 'POST',
    fields: [
      { name: 'full_name', label: 'Full Legal Name on Card / Order', type: 'text', placeholder: 'Full legal name', required: true, autofillKey: 'fullName' },
      { name: 'email', label: 'Order Confirmation Email', type: 'email', placeholder: 'Receipt email address', required: true, autofillKey: 'email' },
      { name: 'address', label: 'Shipping Street Address', type: 'text', placeholder: 'Street address & apt/unit', required: true, autofillKey: 'address' },
      { name: 'city', label: 'City', type: 'text', placeholder: 'City', required: true, autofillKey: 'city' },
      { name: 'state', label: 'State / Province', type: 'text', placeholder: 'State', required: true, autofillKey: 'state' },
      { name: 'postal_code', label: 'ZIP / Postal Code', type: 'text', placeholder: 'Postal code', required: true, autofillKey: 'postalCode' },
    ],
  },
  {
    domain: 'services.portal.gov',
    name: 'Government Identity Services',
    url: 'https://services.portal.gov/identity/renewal-application',
    title: 'Official Identity & License Verification',
    method: 'POST',
    fields: [
      { name: 'legal_name', label: 'Full Legal Name', type: 'text', placeholder: 'As shown on official ID', required: true, autofillKey: 'fullName' },
      { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: '', required: true, autofillKey: 'dateOfBirth' },
      { name: 'ssn_tax', label: 'Tax ID / Social Security (Last 4)', type: 'text', placeholder: 'XXX-XX-XXXX', required: true, autofillKey: 'taxId' },
      { name: 'residential_address', label: 'Permanent Residence', type: 'text', placeholder: 'Home address', required: true, autofillKey: 'address' },
      { name: 'contact_phone', label: 'Primary Contact Phone', type: 'tel', placeholder: 'Phone', required: true, autofillKey: 'phone' },
    ],
  },
  {
    domain: 'b2b.vendorportal.com',
    name: 'Enterprise Vendor Portal',
    url: 'https://b2b.vendorportal.com/invoicing/supplier-registration',
    title: 'Corporate Supplier & Vendor Registration',
    method: 'POST',
    fields: [
      { name: 'company_name', label: 'Registered Business Name', type: 'text', placeholder: 'Corporate legal entity', required: true, autofillKey: 'company' },
      { name: 'ein_tax', label: 'Corporate EIN / VAT Number', type: 'text', placeholder: 'Tax ID', required: true, autofillKey: 'taxId' },
      { name: 'contact_name', label: 'Authorized Officer Name', type: 'text', placeholder: 'Signatory full name', required: true, autofillKey: 'fullName' },
      { name: 'business_email', label: 'Accounts Payable Email', type: 'email', placeholder: 'invoices@company.com', required: true, autofillKey: 'email' },
      { name: 'billing_address', label: 'Headquarters Address', type: 'text', placeholder: 'Corporate HQ address', required: true, autofillKey: 'address' },
      { name: 'website_url', label: 'Company Website', type: 'url', placeholder: 'https://...', autofillKey: 'website' },
    ],
  },
];

const CONTEXT_CHIPS = [
  'Job Application',
  'Checkout & Shipping',
  'Official Verification',
  'Business Invoicing',
  'Academic Registration',
  'Healthcare Intake',
  'Customer Inquiry',
];

export const ExtensionHub: React.FC<ExtensionHubProps> = ({ currentUser, onOpenFormInBuilder }) => {
  const { showToast } = useToast();
  const profiles = getProfiles(currentUser.id);
  const [capturedForms, setCapturedForms] = useState<CapturedWebForm[]>(() =>
    getCapturedForms(currentUser.id)
  );

  // Live Simulator state
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0);
  const currentSite = PRESET_SITES[selectedSiteIndex];
  const [customUrl, setCustomUrl] = useState(currentSite.url);
  const [simulatedValues, setSimulatedValues] = useState<Record<string, any>>({});

  // Context Labeling & Save Modal state
  const [showContextModal, setShowContextModal] = useState(false);
  const [pendingContextData, setPendingContextData] = useState<CapturedWebForm | null>(null);
  const [customContextLabel, setCustomContextLabel] = useState('');
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType>('personal');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);

  // Code inspection modal
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const extensionFiles = generateExtensionFiles();

  // Current Origin calculation
  const currentOrigin = useMemo(() => {
    try {
      const u = new URL(customUrl.startsWith('http') ? customUrl : `https://${customUrl}`);
      return u.origin;
    } catch {
      return `https://${currentSite.domain}`;
    }
  }, [customUrl, currentSite.domain]);

  // Check if current site matches any saved context candidate
  const matchCandidate = useMemo(() => {
    return findAutomatedMatchCandidate(customUrl, capturedForms, profiles);
  }, [customUrl, capturedForms, profiles]);

  // Handle simulated field input
  const handleSimulatedInput = (fieldName: string, value: any) => {
    setSimulatedValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Trigger helper capture utility and show Context Labeling Modal
  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filledCount = Object.values(simulatedValues).filter(
      (v) => v !== undefined && v !== ''
    ).length;

    if (filledCount === 0) {
      showToast('Form Empty', 'Please enter at least one field before submitting.', 'info');
      return;
    }

    // Run the helper utility to extract origin, pathname, metadata, and fields
    const contextResult = extractBrowserFormContext(
      customUrl || currentSite.url,
      currentSite.title,
      currentSite.fields.map((f) => ({
        ...f,
        value: simulatedValues[f.name] || '',
      })),
      {
        method: currentSite.method,
        action: customUrl || currentSite.url,
      }
    );

    const pendingForm: CapturedWebForm = {
      id: `cap_${Date.now()}`,
      userId: currentUser.id,
      sourceUrl: contextResult.sourceUrl,
      originUrl: contextResult.originUrl,
      pathname: contextResult.pathname,
      sourceDomain: contextResult.sourceDomain,
      pageTitle: contextResult.pageTitle,
      contextLabel: contextResult.suggestedLabel,
      matchingProfileType: contextResult.suggestedProfileType,
      autoMatchEnabled: true,
      formMetadata: contextResult.formMetadata,
      fields: contextResult.fields,
      capturedAt: new Date().toISOString(),
      status: 'saved',
      appliedCount: 0,
    };

    setPendingContextData(pendingForm);
    setCustomContextLabel(contextResult.suggestedLabel);
    setSelectedProfileType(contextResult.suggestedProfileType);

    // Pick best matching profile
    const bestProfile =
      profiles.find((p) => p.type === contextResult.suggestedProfileType) ||
      profiles.find((p) => p.isDefault) ||
      profiles[0];
    setSelectedProfileId(bestProfile ? bestProfile.id : '');
    setAutoMatchEnabled(true);

    setShowContextModal(true);
  };

  // Confirm and Save the labeled context
  const handleSaveContext = () => {
    if (!pendingContextData) return;

    const matchedProfile = profiles.find((p) => p.id === selectedProfileId);

    const finalForm: CapturedWebForm = {
      ...pendingContextData,
      contextLabel: customContextLabel.trim() || pendingContextData.contextLabel,
      matchingProfileType: selectedProfileType,
      matchingProfileId: selectedProfileId || undefined,
      matchingProfileName: matchedProfile?.name,
      autoMatchEnabled,
    };

    saveCapturedForm(finalForm);
    setCapturedForms(getCapturedForms(currentUser.id));
    setShowContextModal(false);

    showToast(
      'Context Labeled & Saved!',
      `Labeled as "${finalForm.contextLabel}" for origin ${finalForm.originUrl}. Automated matching active!`
    );
  };

  // Execute Automated Profile Matching for current origin
  const handleApplyAutomatedMatch = (candidateForm?: CapturedWebForm) => {
    const targetForm = candidateForm || matchCandidate.savedForm;
    if (!targetForm) {
      showToast('No Context Found', 'No saved context found for this origin.', 'info');
      return;
    }

    // Find profile
    let targetProfile = profiles.find((p) => p.id === targetForm.matchingProfileId);
    if (!targetProfile && targetForm.matchingProfileType) {
      targetProfile = profiles.find((p) => p.type === targetForm.matchingProfileType);
    }
    if (!targetProfile) {
      targetProfile = profiles.find((p) => p.isDefault) || profiles[0];
    }

    if (!targetProfile) {
      showToast(
        'Profile Required',
        'Please create a profile in the Profiles tab to perform automated matching.',
        'info'
      );
      return;
    }

    // Match profile data against targetForm fields or currentSite fields
    const matchResult = executeAutomatedProfileMatch(targetForm.fields, targetProfile);

    // Apply values to simulated form
    const updatedValues: Record<string, any> = { ...simulatedValues };
    Object.entries(matchResult.matchedValues).forEach(([k, v]) => {
      updatedValues[k] = v;
    });

    setSimulatedValues(updatedValues);

    // Update applied stats
    const updatedForm: CapturedWebForm = {
      ...targetForm,
      appliedCount: (targetForm.appliedCount || 0) + 1,
      lastAppliedAt: new Date().toISOString(),
    };
    saveCapturedForm(updatedForm);
    setCapturedForms(getCapturedForms(currentUser.id));

    showToast(
      'Automated Profile Matched!',
      `Populated ${matchResult.matchedCount} fields using "${targetProfile.name}" (${targetForm.contextLabel}).`
    );
  };

  // Convert a captured form to a full Clip It form
  const handleConvertToStudioForm = (saved: CapturedWebForm) => {
    const newForm = convertCapturedToForm(saved, currentUser.id);
    showToast('Converted to Studio Form', `Created "${newForm.title}" in your Forms library.`);
    onOpenFormInBuilder(newForm);
  };

  const handleDeleteCaptured = (id: string) => {
    deleteCapturedForm(id);
    setCapturedForms(getCapturedForms(currentUser.id));
    showToast('Removed Context', 'Saved form context removed.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold tracking-wide border border-blue-400/20">
            <Globe className="w-3 h-3" />
            Universal Browser Extension & Context Helper
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Capture Window Origin, Form Metadata & Context Labeling
          </h1>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Clip It automatically extracts the browser window's origin URL, request telemetry, and field metadata on submission, allowing you to label the form context and automate profile matching across any online site.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadExtensionZip}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Download Extension (.ZIP)
          </button>

          <button
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold transition-colors"
          >
            <Code className="w-4 h-4" />
            Inspect Source
          </button>
        </div>
      </div>

      {/* 2-Column Layout: Left Live Website Interceptor Simulator | Right Saved Web Forms Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: ClippingHelper Utility & Interactive Live Webpage Simulator */}
        <div className="lg:col-span-7 space-y-4">
          {/* New DOM ClippingHelper Utility Component */}
          <ClippingHelper
            currentUser={currentUser}
            activeDomain={currentSite.domain}
            activeUrl={customUrl || currentSite.url}
            activeTitle={currentSite.title}
            onClipSaved={() => {
              setCapturedForms(getCapturedForms(currentUser.id));
            }}
          />

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
                Live Form Interceptor & Origin Capture Simulator
              </span>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Helper Active
              </span>
            </div>

            {/* Simulated Browser URL bar */}
            <div className="space-y-1.5">
              <div className="bg-neutral-100 p-2 rounded-xl border border-neutral-200 flex items-center gap-2 text-xs">
                <span className="text-neutral-400 font-mono pl-1">https://</span>
                <input
                  type="text"
                  value={customUrl.replace('https://', '')}
                  onChange={(e) => setCustomUrl(`https://${e.target.value}`)}
                  className="flex-1 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-mono text-neutral-800 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  {PRESET_SITES.map((site, idx) => (
                    <button
                      key={site.domain}
                      type="button"
                      onClick={() => {
                        setSelectedSiteIndex(idx);
                        setCustomUrl(site.url);
                        setSimulatedValues({});
                        setShowContextModal(false);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        idx === selectedSiteIndex
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {site.domain}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detected Browser Window Origin Telemetry Card */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-blue-50/60 border border-blue-200/70 rounded-xl text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">Captured Origin URL:</span>
                  <span className="font-mono text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                    {currentOrigin}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 font-mono text-[10px]">
                  <span>Method: <b>{currentSite.method}</b></span>
                  <span>·</span>
                  <span>Inputs: <b>{currentSite.fields.length}</b></span>
                  <span>·</span>
                  <span>Required: <b>{currentSite.fields.filter((f) => f.required).length}</b></span>
                </div>
              </div>
            </div>

            {/* Automated Match Detected Alert (if this origin already has a saved context) */}
            {matchCandidate.hasMatch && matchCandidate.savedForm && matchCandidate.targetProfile && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950">
                      Automated Profile Match Available for this Origin
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      Context: <span className="font-semibold">"{matchCandidate.savedForm.contextLabel}"</span> · Profile: <span className="font-semibold">"{matchCandidate.targetProfile.name}"</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyAutomatedMatch(matchCandidate.savedForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs whitespace-nowrap transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-300 fill-current" />
                  Auto-Match Now
                </button>
              </div>
            )}

            {/* Simulated Webpage Content & Form */}
            <div className="relative border border-neutral-200 rounded-xl p-5 bg-neutral-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{currentSite.title}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Host: {currentSite.domain} · Form Action: {customUrl}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyAutomatedMatch()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition-colors"
                  title="Autofill fields using matching profile"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Match Profile
                </button>
              </div>

              {/* Web Form inputs */}
              <form onSubmit={handleSimulateSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentSite.fields.map((f) => (
                    <div
                      key={f.name}
                      className={f.type === 'textarea' ? 'sm:col-span-2' : ''}
                    >
                      <label className="font-semibold text-neutral-700 flex items-center justify-between mb-1">
                        <span>
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </span>
                        {f.autofillKey && (
                          <span className="text-[9px] font-mono text-neutral-400">
                            key: {f.autofillKey}
                          </span>
                        )}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          value={simulatedValues[f.name] || ''}
                          onChange={(e) => handleSimulatedInput(f.name, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
                        />
                      ) : (
                        <input
                          type={f.type}
                          value={simulatedValues[f.name] || ''}
                          onChange={(e) => handleSimulatedInput(f.name, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-neutral-200">
                  <span className="text-[11px] text-neutral-500">
                    Click <b>Submit Form</b> to trigger the context capture helper.
                  </span>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                  >
                    Submit Form on {currentSite.domain}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Saved Form Contexts Library */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Saved Form Contexts ({capturedForms.length})
                </span>
                <p className="text-[11px] text-neutral-400">
                  Origins with automated matching rules
                </p>
              </div>

              <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                Auto-Matching Active
              </span>
            </div>

            <div className="space-y-3">
              {capturedForms.map((saved) => (
                <div
                  key={saved.id}
                  className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white space-y-2.5 text-xs transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-indigo-600" />
                        <span className="font-bold text-neutral-900">
                          {saved.contextLabel || saved.pageTitle}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-blue-600 mt-0.5 truncate max-w-[220px]">
                        {saved.originUrl || saved.sourceDomain}
                      </div>
                    </div>

                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono shrink-0">
                      {saved.fields.length} fields
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-500 font-mono">
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
                      {saved.formMetadata?.method || 'POST'}
                    </span>
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">
                      Profile: <b>{saved.matchingProfileType || 'personal'}</b>
                    </span>
                    {saved.autoMatchEnabled !== false && (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Auto-Match
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => handleApplyAutomatedMatch(saved)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white rounded-lg text-[11px] font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                    >
                      <Zap className="w-3 h-3 text-amber-300 fill-current" />
                      Auto-Match
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleConvertToStudioForm(saved)}
                        className="px-2 py-1 border border-neutral-200 hover:border-neutral-300 text-neutral-700 rounded-lg text-[11px] font-medium hover:bg-neutral-50 transition-colors"
                        title="Turn this into an editable form in Clip It"
                      >
                        To Studio Form
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCaptured(saved.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {capturedForms.length === 0 && (
                <div className="p-8 text-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-xs text-neutral-500 space-y-2">
                  <Globe className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="font-semibold text-neutral-800">No Form Contexts Saved Yet</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Submit any form on the simulator on the left, or install the extension in your browser to capture origin URLs, metadata, and label contexts on any website!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 bg-neutral-100/70 rounded-2xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              How the Context Helper Works:
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-600 leading-relaxed">
              <li>Captures the browser window's origin (<span className="font-mono text-neutral-800">window.location.origin</span>).</li>
              <li>Extracts form metadata (action URL, HTTP method, inputs, required fields).</li>
              <li>Saves your custom context label (e.g. <i>Job Application</i>) for automated profile matching.</li>
              <li>On future visits to the same origin, automatically maps matching profile attributes.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Context Labeling & Save Modal */}
      {showContextModal && pendingContextData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Label Form Context & Save
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Configure automated profile matching for this origin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContextModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Origin & Form Metadata Snapshot */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Browser Origin URL:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                  {pendingContextData.originUrl}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>Form Metadata:</span>
                <span className="font-mono text-neutral-700">
                  {pendingContextData.formMetadata?.method} · {pendingContextData.formMetadata?.totalInputs} inputs ({pendingContextData.formMetadata?.requiredFieldsCount} required)
                </span>
              </div>
            </div>

            {/* Context Label Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Context Label
              </label>
              <input
                type="text"
                value={customContextLabel}
                onChange={(e) => setCustomContextLabel(e.target.value)}
                placeholder="e.g., Job Application, Shipping & Billing..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-medium focus:outline-none focus:border-neutral-900"
              />

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CONTEXT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCustomContextLabel(chip)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                      customContextLabel === chip
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Profile Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Target Profile for Automated Matching
              </label>
              {profiles.length > 0 ? (
                <select
                  value={selectedProfileId}
                  onChange={(e) => {
                    setSelectedProfileId(e.target.value);
                    const prof = profiles.find((p) => p.id === e.target.value);
                    if (prof) setSelectedProfileType(prof.type);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:border-neutral-900"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type.toUpperCase()}) {p.isDefault ? '— Default' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedProfileType}
                  onChange={(e) => setSelectedProfileType(e.target.value as ProfileType)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:border-neutral-900"
                >
                  <option value="personal">Personal Profile</option>
                  <option value="business">Business / Corporate Profile</option>
                  <option value="family">Family Member Profile</option>
                  <option value="customer">Customer / Client Profile</option>
                </select>
              )}
            </div>

            {/* Auto Match Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="modal-auto-match"
                type="checkbox"
                checked={autoMatchEnabled}
                onChange={(e) => setAutoMatchEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="modal-auto-match" className="text-xs text-neutral-700 cursor-pointer">
                Automatically suggest & match this profile whenever visiting this origin
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleSaveContext}
                className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              >
                Save Form Context
              </button>
              <button
                type="button"
                onClick={() => setShowContextModal(false)}
                className="py-2 px-3 border border-neutral-200 hover:border-neutral-300 text-neutral-700 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Inspector Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Extension Source Code
                </span>
                <h3 className="text-sm font-bold text-neutral-900">
                  Inspect Manifest V3 & Helper Utility Files
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 overflow-x-auto text-xs">
              {extensionFiles.map((file, idx) => (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors whitespace-nowrap ${
                    idx === selectedFileIdx
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-900 text-neutral-100 p-4 rounded-xl font-mono text-xs leading-relaxed max-h-[50vh]">
              <pre>{extensionFiles[selectedFileIdx]?.content}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
              <span className="text-neutral-500">
                File {selectedFileIdx + 1} of {extensionFiles.length}: <b>{extensionFiles[selectedFileIdx]?.name}</b>
              </span>
              <button
                type="button"
                onClick={downloadExtensionZip}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download All (.ZIP)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
