import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Form,
  FormField,
  FormSubmission,
  User,
  Profile
} from '../../types';
import {
  getProfiles,
  saveSubmission,
  getSubmissions
} from '../../services/storage';
import { matchProfileToForm } from '../../services/autofill';
import { exportSubmissionToPdf } from '../../services/exportService';
import { SignaturePad } from '../common/SignaturePad';
import { useToast } from '../common/Toast';
import {
  Sparkles,
  Save,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  Printer,
  ChevronRight,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  Check,
  RotateCcw
} from 'lucide-react';

interface FormFillerProps {
  form: Form;
  currentUser: User;
  onBack: () => void;
  onComplete?: (submission: FormSubmission) => void;
  resumeSubmissionId?: string;
}

export const FormFiller: React.FC<FormFillerProps> = ({
  form,
  currentUser,
  onBack,
  onComplete,
  resumeSubmissionId,
}) => {
  const { showToast } = useToast();
  const profiles = useMemo(() => getProfiles(currentUser.id), [currentUser.id]);
  const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    defaultProfile ? defaultProfile.id : ''
  );

  // Form values state: fieldId -> value
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    // Check if resuming an existing draft
    if (resumeSubmissionId) {
      const existing = getSubmissions(currentUser.id).find((s) => s.id === resumeSubmissionId);
      if (existing) return existing.data;
    }

    // Default initialization (e.g. generate auto_id)
    const initial: Record<string, any> = {};
    for (const f of form.fields) {
      if (f.type === 'auto_id') {
        const prefix = f.autoIdPrefix || 'ID-';
        const digits = f.autoIdDigits || 4;
        const randomNum = Math.floor(Math.random() * Math.pow(10, digits))
          .toString()
          .padStart(digits, '0');
        initial[f.id] = `${prefix}${randomNum}`;
      } else if (f.defaultValue !== undefined) {
        initial[f.id] = f.defaultValue;
      }
    }
    return initial;
  });

  const [signatureData, setSignatureData] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grouped' | 'step'>('grouped');
  const [activeStepIndex, setActiveStepIndex] = useState(0); // for step mode
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<FormSubmission | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>(() => resumeSubmissionId || `sub_${Date.now()}`);

  // Draft auto-save timer
  const autoSaveTimerRef = useRef<any>(null);

  // Calculate progress
  const progressMetrics = useMemo(() => {
    const totalFields = form.fields.filter((f) => f.type !== 'auto_id');
    if (totalFields.length === 0) return { percentage: 100, filled: 0, total: 0, requiredMissing: 0 };

    let filledCount = 0;
    let missingRequired = 0;

    for (const f of totalFields) {
      const val = formData[f.id];
      const isFilled =
        val !== undefined &&
        val !== null &&
        val !== '' &&
        (typeof val === 'boolean' ? true : true);

      if (isFilled) filledCount++;
      if (f.required && !isFilled) missingRequired++;
    }

    const percentage = Math.round((filledCount / totalFields.length) * 100);
    return { percentage, filled: filledCount, total: totalFields.length, requiredMissing: missingRequired };
  }, [form.fields, formData]);

  // Auto-save progress every 5 seconds if dirty
  useEffect(() => {
    if (isCompleted) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft(false);
    }, 4000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, signatureData]);

  // Handle Autofill trigger
  const handleApplyAutofill = () => {
    const prof = profiles.find((p) => p.id === selectedProfileId);
    if (!prof) {
      showToast('Profile Required', 'Please select a saved profile first to autofill.', 'info');
      return;
    }

    const matchResult = matchProfileToForm(form, prof);
    if (matchResult.matchedCount === 0) {
      showToast('No Matches Found', `No profile attributes matched fields in this form.`, 'info');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...matchResult.matchedValues,
    }));

    showToast(
      'Autofill Applied',
      `Populated ${matchResult.matchedCount} fields from "${prof.name}".`,
      'success'
    );
  };

  // Field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error if resolved
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // File upload simulation (encodes to safe data URL)
  const handleFileUpload = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange(fieldId, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: reader.result as string,
      });
      showToast('File Attached', file.name);
    };
    reader.readAsDataURL(file);
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of form.fields) {
      const val = formData[field.id];

      // Required check
      if (field.required) {
        if (field.type === 'signature') {
          const sig = signatureData || val;
          if (!sig) newErrors[field.id] = 'Signature is required';
        } else if (field.type === 'checkbox') {
          if (!val) newErrors[field.id] = 'You must check this box to proceed';
        } else if (val === undefined || val === null || String(val).trim() === '') {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Format validations
      if (val && typeof val === 'string') {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
        if (field.type === 'phone' && val.length < 7) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save draft
  const handleSaveDraft = (notify: boolean = true) => {
    const currentProf = profiles.find((p) => p.id === selectedProfileId);
    const submission: FormSubmission = {
      id: submissionId,
      formId: form.id,
      formTitle: form.title,
      userId: currentUser.id,
      profileIdUsed: selectedProfileId || undefined,
      profileNameUsed: currentProf ? currentProf.name : undefined,
      status: 'draft',
      data: formData,
      signatureDataUrl: signatureData || undefined,
      progressPercentage: progressMetrics.percentage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubmission(submission);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (notify) {
      showToast('Draft Saved', 'Your progress is stored securely.');
    }
  };

  // Complete submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      showToast('Incomplete Form', 'Please fill all required fields highlighted in red.', 'error');
      // In step mode, jump to the first section that has an error
      const firstErrorFieldId = Object.keys(errors)[0];
      if (firstErrorFieldId && viewMode === 'step') {
        const errorField = form.fields.find((f) => f.id === firstErrorFieldId);
        if (errorField?.sectionId) {
          const sIdx = form.sections.findIndex((s) => s.id === errorField.sectionId);
          if (sIdx >= 0) setActiveStepIndex(sIdx);
        }
      }
      return;
    }

    const currentProf = profiles.find((p) => p.id === selectedProfileId);
    const submission: FormSubmission = {
      id: submissionId,
      formId: form.id,
      formTitle: form.title,
      userId: currentUser.id,
      profileIdUsed: selectedProfileId || undefined,
      profileNameUsed: currentProf ? currentProf.name : undefined,
      status: 'completed',
      data: formData,
      signatureDataUrl: signatureData || undefined,
      progressPercentage: 100,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSubmission(submission);
    setCompletedSubmission(submission);
    setIsCompleted(true);
    showToast('Form Completed', 'Your submission was verified and recorded successfully!');
    if (onComplete) onComplete(submission);
  };

  // Success / Completed Screen
  if (isCompleted && completedSubmission) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-xs text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <Check className="w-7 h-7" />
          </div>

          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Official Submission Confirmed
            </span>
            <h2 className="text-2xl font-bold text-neutral-900 mt-1">{form.title}</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Submission ID: <span className="font-mono text-neutral-800">{completedSubmission.id}</span> · Completed on {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 text-left text-xs space-y-2 max-h-56 overflow-y-auto">
            <div className="font-semibold text-neutral-700 pb-1 border-b border-neutral-200 flex items-center justify-between">
              <span>Submitted Responses</span>
              <span className="text-[11px] text-neutral-400 font-mono">
                {Object.keys(formData).length} fields captured
              </span>
            </div>
            {form.fields.slice(0, 6).map((f) => {
              const val = formData[f.id];
              return (
                <div key={f.id} className="flex items-center justify-between py-1">
                  <span className="text-neutral-500 truncate max-w-[200px]">{f.label}</span>
                  <span className="font-semibold text-neutral-800 truncate max-w-[220px]">
                    {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '—')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Export / Print Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => exportSubmissionToPdf(form, completedSubmission, currentUser.organization)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official PDF
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Document
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-4 py-2.5 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active form section for step mode
  const activeSection = form.sections[activeStepIndex] || form.sections[0] || { id: 'default', title: 'Form Details' };
  const stepFields =
    viewMode === 'step'
      ? form.fields.filter((f) => f.sectionId === activeSection.id || (!f.sectionId && activeStepIndex === 0))
      : form.fields;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      {/* Top Header & Sticky Navigation */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3 sticky top-3 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-neutral-900 truncate">{form.title}</h1>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <span>Ref: <span className="font-mono text-neutral-600">{submissionId.slice(-6)}</span></span>
                {lastSavedTime && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600">Saved at {lastSavedTime}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'grouped' ? 'bg-white text-neutral-900 shadow-2xs font-medium' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                All Sections
              </button>
              <button
                type="button"
                onClick={() => setViewMode('step')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'step' ? 'bg-white text-neutral-900 shadow-2xs font-medium' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Step Mode
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSaveDraft(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Missing indicators */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Form Progress: <span className="font-semibold text-neutral-900 font-mono tabular-nums">{progressMetrics.percentage}%</span>
            </span>
            {progressMetrics.requiredMissing > 0 ? (
              <span className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {progressMetrics.requiredMissing} required fields remaining
              </span>
            ) : (
              <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                All required items ready
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-300"
              style={{ width: `${progressMetrics.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reusable Profile Autofill Bar */}
      {profiles.length > 0 && (
        <div className="bg-gradient-to-r from-neutral-900 to-slate-800 text-white rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight">Smart Autofill with Profile</div>
              <p className="text-[11px] text-neutral-300">
                Instantly populate matching personal or corporate fields.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="text-neutral-900">
                  {p.name} {p.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleApplyAutofill}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-neutral-900 rounded-lg text-xs font-semibold hover:bg-neutral-100 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Autofill Now
            </button>
          </div>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {viewMode === 'step' ? (
          /* Step-by-Step Mode */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-6">
            {/* Step navigation tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 overflow-x-auto">
              {form.sections.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeStepIndex === idx
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-neutral-200/50 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>

            <div>
              <h2 className="text-base font-bold text-neutral-900">{activeSection.title}</h2>
              {activeSection.description && (
                <p className="text-xs text-neutral-500 mt-0.5">{activeSection.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stepFields.map((field) => renderFieldInput(field))}
            </div>

            {/* Step Prev / Next Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeStepIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 disabled:opacity-30 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous Section
              </button>

              {activeStepIndex < form.sections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStepIndex((prev) => Math.min(form.sections.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  Next Section <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" /> Submit Form
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Grouped Sections Mode (All Sections View) */
          form.sections.map((section) => {
            const sectionFields = form.fields.filter(
              (f) => f.sectionId === section.id || (!f.sectionId && section.id === form.sections[0]?.id)
            );

            return (
              <div key={section.id} className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="border-b border-neutral-100 pb-2">
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-xs text-neutral-500 mt-0.5">{section.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionFields.map((field) => renderFieldInput(field))}
                </div>
              </div>
            );
          })
        )}

        {/* Bottom Submission Bar */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-500">
            Ensure all information provided is accurate and truthful.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveDraft(true)}
              className="px-4 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Complete & Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  // Field input renderer
  function renderFieldInput(field: FormField) {
    const val = formData[field.id];
    const error = errors[field.id];
    const isFullWidth = field.width === 'full' || field.type === 'textarea' || field.type === 'signature';

    return (
      <div
        key={field.id}
        className={`space-y-1.5 ${isFullWidth ? 'md:col-span-2' : 'md:col-span-1'}`}
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1">
            <span>{field.label}</span>
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.autofillKey && (
            <span className="text-[10px] text-neutral-400 font-mono">
              mapped
            </span>
          )}
        </div>

        {/* Input elements based on type */}
        {field.type === 'textarea' ? (
          <textarea
            rows={3}
            value={val || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'Type here...'}
            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
              error ? 'border-red-500 bg-red-50/20' : 'border-neutral-300 focus:border-neutral-900'
            }`}
          />
        ) : field.type === 'dropdown' ? (
          <select
            value={val || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-colors bg-white ${
              error ? 'border-red-500 bg-red-50/20' : 'border-neutral-300 focus:border-neutral-900'
            }`}
          >
            <option value="">Select an option...</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.type === 'radio' ? (
          <div className="space-y-2 py-1">
            {(field.options || []).map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={val === opt}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="text-neutral-900 focus:ring-neutral-900"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        ) : field.type === 'checkbox' ? (
          <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={Boolean(val)}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="mt-0.5 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300"
            />
            <span className="leading-snug">{field.label}</span>
          </label>
        ) : field.type === 'signature' ? (
          <SignaturePad
            value={signatureData || val}
            defaultName={formData['f_app_name'] || currentUser.name}
            onChange={(sigUrl) => {
              setSignatureData(sigUrl);
              handleFieldChange(field.id, sigUrl);
            }}
          />
        ) : field.type === 'file' || field.type === 'image' ? (
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100/50 transition-colors">
              <UploadCloud className="w-6 h-6 text-neutral-400 mb-1" />
              <span className="text-xs font-medium text-neutral-700">Click to upload file</span>
              <span className="text-[10px] text-neutral-400">PDF, PNG, JPG up to 10MB</span>
              <input
                type="file"
                className="hidden"
                accept={field.type === 'image' ? 'image/*' : '*'}
                onChange={(e) => handleFileUpload(field.id, e)}
              />
            </label>
            {val && typeof val === 'object' && val.fileName && (
              <div className="flex items-center justify-between p-2.5 bg-neutral-100 rounded-lg text-xs">
                <span className="font-semibold text-neutral-800 truncate">{val.fileName}</span>
                <span className="text-neutral-500 font-mono text-[10px]">{val.fileSize}</span>
              </div>
            )}
          </div>
        ) : field.type === 'auto_id' ? (
          <input
            type="text"
            readOnly
            value={val || ''}
            className="w-full px-3 py-2 text-xs border border-neutral-200 bg-neutral-100 rounded-xl text-neutral-600 font-mono"
          />
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
            value={val || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-colors ${
              error ? 'border-red-500 bg-red-50/20' : 'border-neutral-300 focus:border-neutral-900'
            }`}
          />
        )}

        {field.helpText && <p className="text-[11px] text-neutral-400">{field.helpText}</p>}
        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
};
