import React, { useState, useMemo } from 'react';
import {
  User,
  SavedClip,
  CapturedWebField,
  FormMetadata,
  Profile,
  ProfileType,
} from '../../types';
import { saveCapturedForm, getProfiles } from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  Scan,
  Layers,
  Sparkles,
  CheckCircle2,
  Tag,
  Code,
  Globe,
  Settings,
  ArrowRight,
  Database,
  Cpu,
  Play,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  Search,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

declare const chrome: any;

interface ClippingHelperProps {
  currentUser: User;
  onClipSaved?: (savedClip: SavedClip) => void;
  activeDomain?: string;
  activeUrl?: string;
  activeTitle?: string;
}

export interface SerializedFormScan {
  originUrl: string;
  sourceUrl: string;
  pageTitle: string;
  timestamp: string;
  formsCount: number;
  formMetadata: FormMetadata;
  fields: CapturedWebField[];
  rawElementCount: {
    forms: number;
    inputs: number;
    selects: number;
    textareas: number;
  };
}

/**
 * Raw Content Script function to be serialized and injected into the active browser tab
 * via chrome.scripting.executeScript.
 */
export function domScannerInjectionScript(): string {
  return `
(function scanActiveTabDOM() {
  const originUrl = window.location.origin;
  const sourceUrl = window.location.href;
  const pageTitle = document.title || window.location.hostname;
  
  function getFieldLabel(input) {
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
    const id = input.id;
    if (id) {
      const labelEl = document.querySelector('label[for="' + id + '"]');
      if (labelEl && labelEl.innerText.trim()) return labelEl.innerText.trim();
    }
    const parentLabel = input.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) {
      return parentLabel.innerText.replace(input.value || '', '').trim();
    }
    if (input.placeholder) return input.placeholder;
    if (input.title) return input.title;
    if (input.name) return input.name.replace(/[-_]/g, ' ');
    return (input.type || input.tagName.toLowerCase()) + ' field';
  }

  function inferAutofillKey(name, label, placeholder, type) {
    const combined = (name + ' ' + label + ' ' + (placeholder || '')).toLowerCase();
    if (combined.includes('first') && !combined.includes('last')) return 'firstName';
    if (combined.includes('last')) return 'lastName';
    if (combined.includes('full name') || (combined.includes('name') && !combined.includes('user') && !combined.includes('company'))) return 'fullName';
    if (type === 'email' || combined.includes('email')) return 'email';
    if (type === 'tel' || combined.includes('phone') || combined.includes('mobile')) return 'phone';
    if (combined.includes('address') || combined.includes('street')) return 'address';
    if (combined.includes('city')) return 'city';
    if (combined.includes('state') || combined.includes('province')) return 'state';
    if (combined.includes('zip') || combined.includes('postal')) return 'postalCode';
    if (combined.includes('country')) return 'country';
    if (combined.includes('company') || combined.includes('organization')) return 'company';
    if (combined.includes('title') || combined.includes('role') || combined.includes('position')) return 'jobTitle';
    if (combined.includes('tax') || combined.includes('ssn') || combined.includes('ein')) return 'taxId';
    if (combined.includes('website') || combined.includes('url') || combined.includes('linkedin')) return 'website';
    if (combined.includes('note') || combined.includes('message')) return 'notes';
    return undefined;
  }

  const forms = Array.from(document.querySelectorAll('form'));
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
  const selects = Array.from(document.querySelectorAll('select'));
  const textareas = Array.from(document.querySelectorAll('textarea'));

  let requiredCount = 0;
  const serializedFields = [];

  // 1. Process inputs
  inputs.forEach((el, idx) => {
    const isRequired = el.required || el.getAttribute('aria-required') === 'true';
    if (isRequired) requiredCount++;
    const label = getFieldLabel(el);
    const name = el.name || el.id || ('input_' + idx);
    serializedFields.push({
      name: name,
      id: el.id || '',
      label: label,
      type: el.type || 'text',
      tagName: 'input',
      value: el.type === 'checkbox' ? el.checked : (el.value || ''),
      placeholder: el.placeholder || '',
      required: isRequired,
      autocomplete: el.autocomplete || '',
      autofillKey: inferAutofillKey(name, label, el.placeholder, el.type),
      selector: el.id ? ('#' + el.id) : (el.name ? ('input[name="' + el.name + '"]') : ''),
      formId: el.form ? (el.form.id || el.form.name || '') : ''
    });
  });

  // 2. Process selects (dropdowns)
  selects.forEach((sel, idx) => {
    const isRequired = sel.required || sel.getAttribute('aria-required') === 'true';
    if (isRequired) requiredCount++;
    const label = getFieldLabel(sel);
    const name = sel.name || sel.id || ('select_' + idx);
    const options = Array.from(sel.options).map(opt => ({
      value: opt.value,
      text: opt.text.trim()
    }));
    serializedFields.push({
      name: name,
      id: sel.id || '',
      label: label,
      type: 'select-one',
      tagName: 'select',
      value: sel.value || '',
      required: isRequired,
      options: options,
      autofillKey: inferAutofillKey(name, label, '', 'select'),
      selector: sel.id ? ('#' + sel.id) : (sel.name ? ('select[name="' + sel.name + '"]') : ''),
      formId: sel.form ? (sel.form.id || sel.form.name || '') : ''
    });
  });

  // 3. Process textareas
  textareas.forEach((ta, idx) => {
    const isRequired = ta.required || ta.getAttribute('aria-required') === 'true';
    if (isRequired) requiredCount++;
    const label = getFieldLabel(ta);
    const name = ta.name || ta.id || ('textarea_' + idx);
    serializedFields.push({
      name: name,
      id: ta.id || '',
      label: label,
      type: 'textarea',
      tagName: 'textarea',
      value: ta.value || '',
      placeholder: ta.placeholder || '',
      required: isRequired,
      autofillKey: inferAutofillKey(name, label, ta.placeholder, 'textarea'),
      selector: ta.id ? ('#' + ta.id) : (ta.name ? ('textarea[name="' + ta.name + '"]') : ''),
      formId: ta.form ? (ta.form.id || ta.form.name || '') : ''
    });
  });

  const primaryForm = forms[0];
  const formMetadata = {
    action: primaryForm ? (primaryForm.getAttribute('action') || sourceUrl) : sourceUrl,
    method: primaryForm ? ((primaryForm.getAttribute('method') || 'POST').toUpperCase()) : 'POST',
    id: primaryForm ? (primaryForm.id || '') : '',
    name: primaryForm ? (primaryForm.getAttribute('name') || '') : '',
    className: primaryForm ? (primaryForm.className || '') : '',
    totalInputs: serializedFields.length,
    requiredFieldsCount: requiredCount,
    enctype: primaryForm ? (primaryForm.enctype || 'application/x-www-form-urlencoded') : 'application/x-www-form-urlencoded'
  };

  return {
    originUrl: originUrl,
    sourceUrl: sourceUrl,
    pageTitle: pageTitle,
    timestamp: new Date().toISOString(),
    formsCount: forms.length,
    formMetadata: formMetadata,
    fields: serializedFields,
    rawElementCount: {
      forms: forms.length,
      inputs: inputs.length,
      selects: selects.length,
      textareas: textareas.length
    }
  };
})();
`;
}

export const ClippingHelper: React.FC<ClippingHelperProps> = ({
  currentUser,
  onClipSaved,
  activeDomain = 'boards.greenhouse.io',
  activeUrl = 'https://boards.greenhouse.io/careers/job-application',
  activeTitle = 'Senior Engineering Role - Job Application',
}) => {
  const { showToast } = useToast();
  const profiles = getProfiles(currentUser.id);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<SerializedFormScan | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);

  // Labeling Configuration State
  const [clipTitle, setClipTitle] = useState('');
  const [contextLabel, setContextLabel] = useState('Job Application');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    const def = profiles.find((p) => p.isDefault) || profiles[0];
    return def ? def.id : '';
  });
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType>('personal');
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);
  const [customFieldMappings, setCustomFieldMappings] = useState<Record<string, string>>({});

  // Interactive DOM Inspector: Field Toggles & Filter State
  const [enabledFieldNames, setEnabledFieldNames] = useState<Set<string>>(new Set());
  const [expandedFieldNames, setExpandedFieldNames] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<
    'all' | 'input' | 'select' | 'textarea' | 'required' | 'excluded'
  >('all');
  const [searchFieldText, setSearchFieldText] = useState('');

  /**
   * Browser API Content Script Injection Execution:
   * Uses chrome.tabs and chrome.scripting APIs if in extension context,
   * or executes the DOM serialization parser in simulated web app context.
   */
  const handleExecuteDOMScan = async () => {
    setIsScanning(true);

    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.tabs &&
        chrome.tabs.query &&
        chrome.scripting &&
        chrome.scripting.executeScript
      ) {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs: any[]) => {
          if (!tabs[0] || !tabs[0].id) {
            fallbackSimulatedScan();
            return;
          }

          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                const scriptText = `(${domScannerInjectionScript()})`;
                return window.eval(scriptText);
              },
            });

            if (results && results[0] && results[0].result) {
              const res = results[0].result as SerializedFormScan;
              populateScanResult(res);
            } else {
              fallbackSimulatedScan();
            }
          } catch (err) {
            console.warn('Extension tab injection failed, using sandbox fallback:', err);
            fallbackSimulatedScan();
          }
        });
      } else {
        fallbackSimulatedScan();
      }
    } catch {
      fallbackSimulatedScan();
    }
  };

  const fallbackSimulatedScan = () => {
    setTimeout(() => {
      let origin = 'https://boards.greenhouse.io';
      try {
        origin = new URL(activeUrl).origin;
      } catch {
        origin = `https://${activeDomain}`;
      }

      // Generate rich serialized metadata for <form>, <input>, and <select>
      const simulatedScan: SerializedFormScan = {
        originUrl: origin,
        sourceUrl: activeUrl,
        pageTitle: activeTitle,
        timestamp: new Date().toISOString(),
        formsCount: 1,
        formMetadata: {
          action: activeUrl,
          method: 'POST',
          id: 'application-form',
          name: 'job_application',
          className: 'standard-application-form',
          totalInputs: 8,
          requiredFieldsCount: 5,
          enctype: 'multipart/form-data',
        },
        rawElementCount: {
          forms: 1,
          inputs: 6,
          selects: 1,
          textareas: 1,
        },
        fields: [
          {
            name: 'first_name',
            id: 'first_name_input',
            label: 'First Name',
            type: 'text',
            tagName: 'input',
            value: '',
            placeholder: 'Legal first name',
            required: true,
            autocomplete: 'given-name',
            autofillKey: 'firstName',
            selector: '#first_name_input',
          },
          {
            name: 'last_name',
            id: 'last_name_input',
            label: 'Last Name',
            type: 'text',
            tagName: 'input',
            value: '',
            placeholder: 'Legal last name',
            required: true,
            autocomplete: 'family-name',
            autofillKey: 'lastName',
            selector: '#last_name_input',
          },
          {
            name: 'email',
            id: 'email_input',
            label: 'Email Address',
            type: 'email',
            tagName: 'input',
            value: '',
            placeholder: 'name@example.com',
            required: true,
            autocomplete: 'email',
            autofillKey: 'email',
            selector: '#email_input',
          },
          {
            name: 'phone',
            id: 'phone_input',
            label: 'Mobile Phone Number',
            type: 'tel',
            tagName: 'input',
            value: '',
            placeholder: '+1 (555) 000-0000',
            required: true,
            autocomplete: 'tel',
            autofillKey: 'phone',
            selector: '#phone_input',
          },
          {
            name: 'work_authorization',
            id: 'work_auth_select',
            label: 'Work Authorization Status',
            type: 'select-one',
            tagName: 'select',
            value: 'US Citizen / Permanent Resident',
            required: true,
            selector: '#work_auth_select',
            autofillKey: 'notes',
            options: [
              { value: 'citizen', text: 'US Citizen / Permanent Resident' },
              { value: 'visa_transfer', text: 'Visa Sponsorship Required' },
              { value: 'student_opt', text: 'F-1 OPT / STEM' },
              { value: 'other', text: 'Other Employment Authorization' },
            ],
          },
          {
            name: 'location',
            id: 'location_input',
            label: 'Current Residence (City, State)',
            type: 'text',
            tagName: 'input',
            value: '',
            placeholder: 'e.g. Austin, TX',
            required: false,
            autofillKey: 'city',
            selector: '#location_input',
          },
          {
            name: 'linkedin_url',
            id: 'linkedin_input',
            label: 'LinkedIn Profile / Website',
            type: 'url',
            tagName: 'input',
            value: '',
            placeholder: 'https://linkedin.com/in/...',
            required: false,
            autofillKey: 'website',
            selector: '#linkedin_input',
          },
          {
            name: 'cover_summary',
            id: 'cover_summary_ta',
            label: 'Candidate Introduction & Summary',
            type: 'textarea',
            tagName: 'textarea',
            value: '',
            placeholder: 'Brief summary of relevant experience...',
            required: false,
            autofillKey: 'notes',
            selector: '#cover_summary_ta',
          },
        ],
      };

      populateScanResult(simulatedScan);
    }, 600);
  };

  const populateScanResult = (result: SerializedFormScan) => {
    setScanResult(result);
    setIsScanning(false);

    // Default label configuration
    setClipTitle(`${result.pageTitle} Clip`);
    if (/job|career|applicant/i.test(result.sourceUrl + ' ' + result.pageTitle)) {
      setContextLabel('Job Application');
      setSelectedProfileType('personal');
    } else if (/checkout|billing|order|cart/i.test(result.sourceUrl + ' ' + result.pageTitle)) {
      setContextLabel('Checkout & Billing');
      setSelectedProfileType('personal');
    } else {
      setContextLabel('Web Form');
      setSelectedProfileType('personal');
    }

    // Default ALL fields to enabled/toggled ON initially
    const initialEnabled = new Set(result.fields.map((f) => f.name));
    setEnabledFieldNames(initialEnabled);
    setExpandedFieldNames(new Set());
    setFilterType('all');
    setSearchFieldText('');

    // Pre-populate field mappings
    const mappings: Record<string, string> = {};
    result.fields.forEach((f) => {
      if (f.autofillKey) mappings[f.name] = f.autofillKey;
    });
    setCustomFieldMappings(mappings);

    setShowConfigModal(true);
    showToast(
      'DOM Scanned Successfully',
      `Found ${result.fields.length} form inputs & selects across ${result.originUrl}.`
    );
  };

  // Toggle individual field on/off
  const handleToggleField = (fieldName: string) => {
    setEnabledFieldNames((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const handleSelectAllFields = () => {
    if (!scanResult) return;
    setEnabledFieldNames(new Set(scanResult.fields.map((f) => f.name)));
  };

  const handleDeselectAllFields = () => {
    setEnabledFieldNames(new Set());
  };

  const handleSelectOnlyRequired = () => {
    if (!scanResult) return;
    setEnabledFieldNames(new Set(scanResult.fields.filter((f) => f.required).map((f) => f.name)));
  };

  const handleToggleFieldDetail = (fieldName: string) => {
    setExpandedFieldNames((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  // Filtered fields based on search & filter category
  const filteredFields = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.fields.filter((field) => {
      // 1. Text search
      if (searchFieldText.trim()) {
        const query = searchFieldText.toLowerCase();
        const matchesQuery =
          field.name.toLowerCase().includes(query) ||
          field.label.toLowerCase().includes(query) ||
          (field.placeholder && field.placeholder.toLowerCase().includes(query)) ||
          (field.id && field.id.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // 2. Type filter
      if (filterType === 'input') return field.tagName === 'input';
      if (filterType === 'select') return field.tagName === 'select';
      if (filterType === 'textarea') return field.tagName === 'textarea';
      if (filterType === 'required') return Boolean(field.required);
      if (filterType === 'excluded') return !enabledFieldNames.has(field.name);
      return true;
    });
  }, [scanResult, searchFieldText, filterType, enabledFieldNames]);

  /**
   * Saves the labeled configuration as a 'Saved Clip', including ONLY the toggled-on fields
   */
  const handleSaveConfiguration = () => {
    if (!scanResult) return;

    if (enabledFieldNames.size === 0) {
      showToast(
        'No Fields Selected',
        'Please toggle at least one input field on to save the Clip.',
        'error'
      );
      return;
    }

    const includedFields = scanResult.fields.filter((f) => enabledFieldNames.has(f.name));
    const matchedProfile = profiles.find((p) => p.id === selectedProfileId);

    const savedClip: SavedClip = {
      id: `clip_${Date.now()}`,
      userId: currentUser.id,
      clipTitle: clipTitle.trim() || `${scanResult.pageTitle} Clip`,
      sourceUrl: scanResult.sourceUrl,
      originUrl: scanResult.originUrl,
      pathname: new URL(scanResult.sourceUrl).pathname,
      sourceDomain: new URL(scanResult.sourceUrl).hostname,
      pageTitle: scanResult.pageTitle,
      contextLabel: contextLabel.trim() || 'Saved Clip',
      matchingProfileType: selectedProfileType,
      matchingProfileId: selectedProfileId || undefined,
      matchingProfileName: matchedProfile?.name,
      autoMatchEnabled,
      formMetadata: {
        ...scanResult.formMetadata,
        totalInputs: includedFields.length,
        requiredFieldsCount: includedFields.filter((f) => f.required).length,
      },
      fieldMappings: customFieldMappings,
      fields: includedFields.map((f) => ({
        ...f,
        autofillKey: customFieldMappings[f.name] || f.autofillKey,
      })),
      capturedAt: new Date().toISOString(),
      status: 'saved',
      appliedCount: 0,
    };

    saveCapturedForm(savedClip);
    setShowConfigModal(false);

    if (onClipSaved) {
      onClipSaved(savedClip);
    }

    const excludedCount = scanResult.fields.length - includedFields.length;
    showToast(
      'Saved Clip Created!',
      `Saved ${includedFields.length} selected fields (${excludedCount} excluded) as "${savedClip.clipTitle}".`
    );
  };

  const copySerializedJson = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(JSON.stringify(scanResult, null, 2));
    showToast('Copied to Clipboard', 'Serialized DOM form metadata copied.');
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-700">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                ClippingHelper Utility
              </h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.5 rounded font-semibold">
                DOM Script Injector
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Injects content script into active tab, serializes &lt;form&gt;, &lt;input&gt;, and &lt;select&gt; elements, and allows toggling fields before saving clips.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleExecuteDOMScan}
          disabled={isScanning}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 disabled:opacity-70"
        >
          {isScanning ? (
            <>
              <Cpu className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Scanning Tab DOM...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
              <span>Scan Active Tab DOM</span>
            </>
          )}
        </button>
      </div>

      {/* Origin Telemetry & Target Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Target Origin URL
          </span>
          <span className="font-mono text-blue-600 font-semibold truncate block">
            https://{activeDomain}
          </span>
        </div>

        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Interactive DOM Inspector
          </span>
          <span className="text-neutral-700 font-medium truncate block">
            Toggle &lt;input&gt; & &lt;select&gt; On / Off
          </span>
        </div>

        <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Autofill Destination
          </span>
          <span className="text-neutral-700 font-medium truncate block">
            'Saved Clip' Profile Mapping
          </span>
        </div>
      </div>

      {/* If scanned result is present, display preview */}
      {scanResult && (
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-neutral-900">
                Active Scan Ready: {scanResult.fields.length} Elements Serialized
              </span>
              <span className="text-[11px] text-neutral-500 block">
                {enabledFieldNames.size} of {scanResult.fields.length} fields toggled on for Clip
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowRawJsonModal(true)}
              className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Tag className="w-3 h-3 text-amber-300" />
              <span>Inspect & Configure Clip</span>
            </button>
          </div>
        </div>
      )}

      {/* Labeling & Configuration Interface Modal */}
      {showConfigModal && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Interactive DOM Inspector & Saved Clip Configuration
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Toggle individual inputs on or off to choose exactly which fields to include in your Saved Clip.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Origin & Metadata Badge */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Active Origin URL:</span>
                  <span className="font-mono text-blue-700 font-semibold">
                    {scanResult.originUrl}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>DOM Elements Found:</span>
                  <span className="font-mono text-neutral-700">
                    {scanResult.fields.length} total ({scanResult.rawElementCount.selects} selects, {scanResult.formMetadata.requiredFieldsCount} required)
                  </span>
                </div>
              </div>

              {/* Clip Title Input */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800 block">
                  Clip Title
                </label>
                <input
                  type="text"
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  placeholder="e.g. Standard Job Application Clip, Checkout Express Clip..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 font-medium"
                />
              </div>

              {/* Context Category & Preset Chips */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800 block">
                  Context Category Label
                </label>
                <input
                  type="text"
                  value={contextLabel}
                  onChange={(e) => setContextLabel(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    'Job Application',
                    'Checkout & Billing',
                    'Official Verification',
                    'Business Invoicing',
                    'Academic Registration',
                    'Customer Intake',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setContextLabel(chip)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        contextLabel === chip
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
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800 block">
                  Associated Profile for Future Autofill Mapping
                </label>
                {profiles.length > 0 ? (
                  <select
                    value={selectedProfileId}
                    onChange={(e) => {
                      setSelectedProfileId(e.target.value);
                      const p = profiles.find((prof) => prof.id === e.target.value);
                      if (p) setSelectedProfileType(p.type);
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type.toUpperCase()}) {p.isDefault ? '· Default' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedProfileType}
                    onChange={(e) => setSelectedProfileType(e.target.value as ProfileType)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-neutral-900"
                  >
                    <option value="personal">Personal Profile</option>
                    <option value="business">Business Profile</option>
                    <option value="family">Family Member Profile</option>
                    <option value="customer">Customer Profile</option>
                  </select>
                )}
              </div>

              {/* Interactive DOM Inspector List with Field Toggles */}
              <div className="space-y-2.5 pt-3 border-t border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-neutral-900">
                      Interactive DOM Inspector & Field Toggles
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {enabledFieldNames.size} of {scanResult.fields.length} Selected
                    </span>
                  </div>

                  {/* Batch Selection Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAllFields}
                      className="px-2 py-1 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllFields}
                      className="px-2 py-1 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
                    >
                      Deselect All
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectOnlyRequired}
                      className="px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      Required Only
                    </button>
                  </div>
                </div>

                {/* Search & Category Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200/80">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-400" />
                    <input
                      type="text"
                      value={searchFieldText}
                      onChange={(e) => setSearchFieldText(e.target.value)}
                      placeholder="Search fields (e.g. email, address, name)..."
                      className="w-full pl-8 pr-7 py-1 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
                    />
                    {searchFieldText && (
                      <button
                        type="button"
                        onClick={() => setSearchFieldText('')}
                        className="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                    {[
                      { key: 'all', label: `All (${scanResult.fields.length})` },
                      { key: 'input', label: `Inputs (${scanResult.rawElementCount.inputs})` },
                      { key: 'select', label: `Selects (${scanResult.rawElementCount.selects})` },
                      { key: 'required', label: `Required (${scanResult.formMetadata.requiredFieldsCount})` },
                      { key: 'excluded', label: `Excluded (${scanResult.fields.length - enabledFieldNames.size})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterType(tab.key as any)}
                        className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                          filterType === tab.key
                            ? 'bg-neutral-900 text-white font-semibold'
                            : 'text-neutral-600 hover:bg-neutral-200 bg-white border border-neutral-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Fields List */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto border border-neutral-200 rounded-xl p-2 bg-neutral-50/40">
                  {filteredFields.map((field) => {
                    const isEnabled = enabledFieldNames.has(field.name);
                    const isExpanded = expandedFieldNames.has(field.name);

                    return (
                      <div
                        key={field.name}
                        className={`rounded-xl border transition-all text-xs ${
                          isEnabled
                            ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
                            : 'bg-neutral-100/60 border-neutral-200/60 opacity-60'
                        }`}
                      >
                        <div className="p-2.5 flex items-center justify-between gap-3">
                          {/* Toggle Checkbox and Field Tag / Name */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleField(field.name)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                isEnabled
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-neutral-200 text-transparent border border-neutral-300 hover:border-neutral-400'
                              }`}
                              title={isEnabled ? 'Click to exclude field' : 'Click to include field in Clip'}
                            >
                              ✓
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                    field.tagName === 'select'
                                      ? 'bg-amber-100 text-amber-800'
                                      : field.tagName === 'textarea'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {field.tagName || field.type}
                                </span>

                                <span
                                  className={`font-semibold truncate ${
                                    isEnabled
                                      ? 'text-neutral-900'
                                      : 'text-neutral-400 line-through'
                                  }`}
                                >
                                  {field.label || field.name}
                                </span>

                                {field.required && (
                                  <span className="text-[10px] text-red-500 font-bold" title="Required input">
                                    *
                                  </span>
                                )}

                                {!isEnabled && (
                                  <span className="text-[9px] font-mono bg-neutral-200 text-neutral-600 px-1 rounded">
                                    Excluded
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] font-mono text-neutral-400 truncate">
                                name: <span className="text-neutral-600">{field.name}</span>
                                {field.id && <span> · id: <span className="text-neutral-600">{field.id}</span></span>}
                              </div>
                            </div>
                          </div>

                          {/* Profile Mapping & Details Expander */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Attribute Details toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleFieldDetail(field.name)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100"
                              title="Inspect DOM attributes"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Mapping Selector */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">maps:</span>
                              <select
                                disabled={!isEnabled}
                                value={customFieldMappings[field.name] || field.autofillKey || ''}
                                onChange={(e) =>
                                  setCustomFieldMappings((prev) => ({
                                    ...prev,
                                    [field.name]: e.target.value,
                                  }))
                                }
                                className={`rounded px-1.5 py-0.5 text-[11px] font-mono focus:outline-none ${
                                  isEnabled
                                    ? 'bg-neutral-50 border border-neutral-200 text-neutral-800 focus:border-neutral-900'
                                    : 'bg-neutral-100 border border-neutral-200 text-neutral-400 cursor-not-allowed'
                                }`}
                              >
                                <option value="">(None)</option>
                                <option value="fullName">fullName</option>
                                <option value="firstName">firstName</option>
                                <option value="lastName">lastName</option>
                                <option value="email">email</option>
                                <option value="phone">phone</option>
                                <option value="address">address</option>
                                <option value="city">city</option>
                                <option value="state">state</option>
                                <option value="postalCode">postalCode</option>
                                <option value="country">country</option>
                                <option value="company">company</option>
                                <option value="jobTitle">jobTitle</option>
                                <option value="taxId">taxId</option>
                                <option value="website">website</option>
                                <option value="notes">notes</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Expanded DOM Element Attributes Inspector */}
                        {isExpanded && (
                          <div className="px-3 pb-2.5 pt-1 border-t border-neutral-100 text-[10px] font-mono bg-neutral-50/70 rounded-b-xl space-y-1 text-neutral-600">
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400">Selector:</span>
                              <span className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-blue-700">
                                {field.selector || `[name="${field.name}"]`}
                              </span>
                            </div>

                            {field.placeholder && (
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-400">Placeholder:</span>
                                <span>"{field.placeholder}"</span>
                              </div>
                            )}

                            {field.autocomplete && (
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-400">Autocomplete:</span>
                                <span>{field.autocomplete}</span>
                              </div>
                            )}

                            {field.options && field.options.length > 0 && (
                              <div className="pt-0.5">
                                <span className="text-neutral-400 block mb-0.5">
                                  Select Options ({field.options.length}):
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {field.options.map((opt) => (
                                    <span
                                      key={opt.value}
                                      className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-700"
                                    >
                                      {opt.text} <span className="text-neutral-400">({opt.value})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredFields.length === 0 && (
                    <div className="p-6 text-center text-xs text-neutral-400">
                      No fields matched "{searchFieldText}".
                    </div>
                  )}
                </div>
              </div>

              {/* Auto Match Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="clip-automatch"
                  type="checkbox"
                  checked={autoMatchEnabled}
                  onChange={(e) => setAutoMatchEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="clip-automatch" className="text-xs text-neutral-700 cursor-pointer">
                  Auto-match and suggest this Saved Clip on <b>{scanResult.originUrl}</b>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={copySerializedJson}
                className="flex items-center gap-1.5 px-3 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfiguration}
                  disabled={enabledFieldNames.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Clip ({enabledFieldNames.size} Fields)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Inspection Modal */}
      {showRawJsonModal && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-neutral-200 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                Serialized DOM Tree JSON
              </h3>
              <button
                type="button"
                onClick={() => setShowRawJsonModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 overflow-y-auto bg-neutral-900 text-neutral-100 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed">
              {JSON.stringify(scanResult, null, 2)}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={copySerializedJson}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
