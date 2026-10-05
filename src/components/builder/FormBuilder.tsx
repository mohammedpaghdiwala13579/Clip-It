import React, { useState } from 'react';
import {
  Form,
  FormField,
  FormFieldType,
  FormSection,
  User,
  TemplateCategory
} from '../../types';
import { saveForm } from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Calendar,
  Clock,
  ChevronDown,
  CircleDot,
  CheckSquare,
  Upload,
  PenTool,
  MapPin,
  Image as ImageIcon,
  Key,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  Settings,
  Save,
  Eye,
  Check,
  ArrowLeft,
  HelpCircle,
  FolderPlus
} from 'lucide-react';

interface FormBuilderProps {
  currentUser: User;
  initialForm?: Form;
  onBack: () => void;
  onSaveSuccess: (savedForm: Form) => void;
  onPreviewFill?: (form: Form) => void;
}

interface PaletteItem {
  type: FormFieldType;
  label: string;
  icon: React.ReactNode;
  category: 'text' | 'choice' | 'advanced';
}

const FIELD_PALETTE: PaletteItem[] = [
  { type: 'text', label: 'Single Line Text', icon: <Type className="w-4 h-4 text-blue-600" />, category: 'text' },
  { type: 'textarea', label: 'Long Text / Paragraph', icon: <AlignLeft className="w-4 h-4 text-blue-600" />, category: 'text' },
  { type: 'number', label: 'Numeric Figure', icon: <Hash className="w-4 h-4 text-emerald-600" />, category: 'text' },
  { type: 'email', label: 'Email Address', icon: <Mail className="w-4 h-4 text-indigo-600" />, category: 'text' },
  { type: 'phone', label: 'Phone / Mobile', icon: <Phone className="w-4 h-4 text-cyan-600" />, category: 'text' },
  { type: 'address', label: 'Postal Address', icon: <MapPin className="w-4 h-4 text-rose-600" />, category: 'text' },
  { type: 'date', label: 'Calendar Date', icon: <Calendar className="w-4 h-4 text-amber-600" />, category: 'choice' },
  { type: 'time', label: 'Time Picker', icon: <Clock className="w-4 h-4 text-amber-600" />, category: 'choice' },
  { type: 'dropdown', label: 'Dropdown Select', icon: <ChevronDown className="w-4 h-4 text-purple-600" />, category: 'choice' },
  { type: 'radio', label: 'Radio Option List', icon: <CircleDot className="w-4 h-4 text-purple-600" />, category: 'choice' },
  { type: 'checkbox', label: 'Checkbox Confirm', icon: <CheckSquare className="w-4 h-4 text-purple-600" />, category: 'choice' },
  { type: 'signature', label: 'Digital Signature', icon: <PenTool className="w-4 h-4 text-slate-800" />, category: 'advanced' },
  { type: 'file', label: 'Document / File Upload', icon: <Upload className="w-4 h-4 text-slate-600" />, category: 'advanced' },
  { type: 'image', label: 'Image Upload', icon: <ImageIcon className="w-4 h-4 text-slate-600" />, category: 'advanced' },
  { type: 'auto_id', label: 'Auto-Generated ID', icon: <Key className="w-4 h-4 text-slate-600" />, category: 'advanced' },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({
  currentUser,
  initialForm,
  onBack,
  onSaveSuccess,
  onPreviewFill,
}) => {
  const { showToast } = useToast();

  const [formState, setFormState] = useState<Form>(() => {
    if (initialForm) return JSON.parse(JSON.stringify(initialForm));
    return {
      id: `form_${Date.now()}`,
      userId: currentUser.id,
      title: 'Untitled Digital Form',
      description: 'Please complete all required fields carefully.',
      category: 'Applications',
      status: 'draft',
      isTemplate: false,
      sections: [
        { id: 'sec_1', title: 'Primary Details', description: 'General applicant or responder information' },
      ],
      fields: [
        {
          id: `fld_${Date.now()}_1`,
          type: 'text',
          label: 'Full Legal Name',
          placeholder: 'Enter full name',
          required: true,
          autofillKey: 'fullName',
          width: 'half',
          sectionId: 'sec_1',
        },
        {
          id: `fld_${Date.now()}_2`,
          type: 'email',
          label: 'Email Address',
          placeholder: 'Enter email address',
          required: true,
          autofillKey: 'email',
          width: 'half',
          sectionId: 'sec_1',
        },
      ],
      submissionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['New Form'],
    };
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    formState.fields[0]?.id || null
  );

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showSectionModal, setShowSectionModal] = useState(false);

  const selectedField = formState.fields.find((f) => f.id === selectedFieldId);

  // Field manipulation handlers
  const handleAddField = (type: FormFieldType) => {
    const id = `fld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const targetSection = formState.sections[formState.sections.length - 1]?.id || 'sec_1';

    let defaultOptions: string[] | undefined = undefined;
    if (type === 'dropdown' || type === 'radio') {
      defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
    }

    const fieldLabels: Record<FormFieldType, string> = {
      text: 'Text Field',
      textarea: 'Detailed Description',
      number: 'Numeric Value',
      email: 'Email Address',
      phone: 'Phone Number',
      date: 'Date',
      time: 'Time',
      dropdown: 'Select Option',
      radio: 'Multiple Choice Option',
      checkbox: 'I agree to the terms',
      file: 'Attachment / Document',
      signature: 'Digital Signature',
      address: 'Street Address',
      image: 'Photo Upload',
      auto_id: 'Tracking ID',
    };

    const newField: FormField = {
      id,
      type,
      label: fieldLabels[type],
      required: false,
      sectionId: targetSection,
      width: type === 'textarea' || type === 'signature' || type === 'checkbox' ? 'full' : 'half',
      options: defaultOptions,
      autoIdPrefix: type === 'auto_id' ? 'REC-' : undefined,
      autoIdDigits: type === 'auto_id' ? 5 : undefined,
    };

    setFormState((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setSelectedFieldId(id);
    showToast('Field Added', `Added ${fieldLabels[type]} to form.`);
  };

  const handleDuplicateField = (fieldId: string) => {
    const idx = formState.fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    const original = formState.fields[idx];
    const copy: FormField = {
      ...JSON.parse(JSON.stringify(original)),
      id: `fld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: `${original.label} (Copy)`,
    };

    const newFields = [...formState.fields];
    newFields.splice(idx + 1, 0, copy);
    setFormState((prev) => ({ ...prev, fields: newFields }));
    setSelectedFieldId(copy.id);
    showToast('Field Duplicated', `Created copy of "${original.label}"`);
  };

  const handleDeleteField = (fieldId: string) => {
    setFormState((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formState.fields.length) return;

    const list = [...formState.fields];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);
    setFormState((prev) => ({ ...prev, fields: list }));
  };

  const handleUpdateSelectedField = (updates: Partial<FormField>) => {
    if (!selectedFieldId) return;
    setFormState((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f)),
    }));
  };

  // Section handlers
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: FormSection = {
      id: `sec_${Date.now()}`,
      title: newSectionTitle.trim(),
    };
    setFormState((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSec],
    }));
    setNewSectionTitle('');
    setShowSectionModal(false);
    showToast('Section Added', `Section "${newSec.title}" created.`);
  };

  const handleDeleteSection = (secId: string) => {
    if (formState.sections.length <= 1) {
      showToast('Action Denied', 'Forms require at least one section.', 'error');
      return;
    }
    const remainingSections = formState.sections.filter((s) => s.id !== secId);
    const fallbackSecId = remainingSections[0].id;

    setFormState((prev) => ({
      ...prev,
      sections: remainingSections,
      fields: prev.fields.map((f) => (f.sectionId === secId ? { ...f, sectionId: fallbackSecId } : f)),
    }));
  };

  // Save form
  const handleSaveForm = (publishStatus: 'draft' | 'published' = 'published') => {
    if (!formState.title.trim()) {
      showToast('Missing Title', 'Please enter a title for this form.', 'error');
      return;
    }
    if (formState.fields.length === 0) {
      showToast('Empty Form', 'Please add at least one field to this form before saving.', 'error');
      return;
    }

    const updated: Form = {
      ...formState,
      status: publishStatus,
      updatedAt: new Date().toISOString(),
    };

    saveForm(updated);
    showToast(
      publishStatus === 'published' ? 'Form Published' : 'Draft Saved',
      `"${updated.title}" is ready.`
    );
    onSaveSuccess(updated);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Form Builder
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-neutral-100 text-neutral-700">
                {formState.status.toUpperCase()}
              </span>
            </div>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              placeholder="Enter form title..."
              className="text-lg font-bold text-neutral-900 border-none focus:outline-none focus:ring-0 p-0 hover:bg-neutral-100/50 rounded px-1 -ml-1 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onPreviewFill && (
            <button
              type="button"
              onClick={() => onPreviewFill(formState)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-500" />
              Preview & Fill
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveForm('draft')}
            className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSaveForm('published')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            Publish Form
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout: Left Palette | Center Canvas | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Palette of Field Types */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Add Field
              </span>
              <span className="text-[11px] text-neutral-400">Click to insert</span>
            </div>

            <div className="space-y-1">
              {FIELD_PALETTE.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddField(item.type)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-neutral-50 border border-transparent hover:border-neutral-200 text-xs text-neutral-800 font-medium transition-colors"
                >
                  <span className="p-1 rounded-lg bg-neutral-100">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Metadata Settings */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-700 block">
              Form Metadata
            </span>

            <div>
              <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Category</label>
              <select
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value as TemplateCategory })}
                className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
              >
                <option value="Applications">Applications</option>
                <option value="Invoices">Invoices</option>
                <option value="Registration forms">Registration forms</option>
                <option value="Employee forms">Employee forms</option>
                <option value="Customer forms">Customer forms</option>
                <option value="School forms">School forms</option>
                <option value="Business forms">Business forms</option>
                <option value="Contact forms">Contact forms</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Description</label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
                placeholder="Helpful guidance for respondents..."
              />
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">Save as Reusable Template</span>
              <input
                type="checkbox"
                checked={formState.isTemplate}
                onChange={(e) => setFormState({ ...formState, isTemplate: e.target.checked })}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Center: Live Form Visual Canvas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-6 min-h-[500px]">
            {/* Form Title & Description Header */}
            <div className="border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-bold text-neutral-900">{formState.title}</h2>
              {formState.description && (
                <p className="text-xs text-neutral-500 mt-1">{formState.description}</p>
              )}
            </div>

            {/* Sections & Fields */}
            {formState.sections.map((section, sIndex) => {
              const secFields = formState.fields.filter(
                (f) => f.sectionId === section.id || (!f.sectionId && sIndex === 0)
              );

              return (
                <div key={section.id} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/70">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 tracking-wide">
                        {section.title}
                      </span>
                      {section.description && (
                        <p className="text-[11px] text-neutral-500">{section.description}</p>
                      )}
                    </div>
                    {formState.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section.id)}
                        className="text-neutral-400 hover:text-red-600 p-1 rounded"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Fields in this section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {secFields.map((field) => {
                      const overallIdx = formState.fields.findIndex((f) => f.id === field.id);
                      const isSelected = field.id === selectedFieldId;

                      const colSpanClass =
                        field.width === 'full' || field.type === 'textarea' || field.type === 'signature'
                          ? 'md:col-span-2'
                          : 'md:col-span-1';

                      return (
                        <div
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${colSpanClass} ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-50/50 ring-2 ring-neutral-900/10 shadow-xs'
                              : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/30'
                          }`}
                        >
                          {/* Field action bar on hover/selection */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 border border-neutral-200 rounded-lg p-0.5 shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveField(overallIdx, 'up');
                              }}
                              disabled={overallIdx === 0}
                              className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveField(overallIdx, 'down');
                              }}
                              disabled={overallIdx === formState.fields.length - 1}
                              className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateField(field.id);
                              }}
                              className="p-1 text-neutral-500 hover:text-neutral-900"
                              title="Duplicate field"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(field.id);
                              }}
                              className="p-1 text-neutral-500 hover:text-red-600"
                              title="Delete field"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Field Label & Required */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xs font-semibold text-neutral-800">{field.label}</span>
                            {field.required && <span className="text-red-500 text-xs">*</span>}
                            {field.autofillKey && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                                autofill:{field.autofillKey}
                              </span>
                            )}
                          </div>

                          {/* Field Mock Visual */}
                          {field.type === 'textarea' ? (
                            <div className="w-full h-16 bg-neutral-50 rounded-lg border border-neutral-200 p-2 text-xs text-neutral-400">
                              {field.placeholder || 'Long paragraph text...'}
                            </div>
                          ) : field.type === 'signature' ? (
                            <div className="w-full h-16 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-400 gap-1.5">
                              <PenTool className="w-3.5 h-3.5" />
                              <span>Signature Canvas</span>
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="flex items-center gap-2 text-xs text-neutral-600 py-1">
                              <div className="w-4 h-4 rounded border border-neutral-300 bg-white" />
                              <span>{field.label}</span>
                            </div>
                          ) : field.type === 'dropdown' ? (
                            <div className="w-full py-1.5 px-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
                              <span>Select an option</span>
                              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                            </div>
                          ) : field.type === 'radio' ? (
                            <div className="space-y-1 py-1">
                              {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                                  <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 bg-white" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="w-full py-1.5 px-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-400">
                              {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                            </div>
                          )}

                          {field.helpText && (
                            <p className="text-[11px] text-neutral-400 mt-1">{field.helpText}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Add Section Button */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowSectionModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-dashed border-neutral-300 hover:border-neutral-400 px-4 py-2 rounded-xl transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Add New Form Section
              </button>
            </div>
          </div>
        </div>

        {/* Right: Field Properties Inspector */}
        <div className="lg:col-span-3">
          {selectedField ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="font-bold uppercase tracking-wider text-neutral-700">
                  Field Settings
                </span>
                <span className="font-mono text-[10px] text-neutral-400 uppercase">
                  {selectedField.type}
                </span>
              </div>

              {/* Label */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Field Label</label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Placeholder */}
              {selectedField.type !== 'checkbox' && selectedField.type !== 'signature' && (
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => handleUpdateSelectedField({ placeholder: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
                    placeholder="Enter placeholder text"
                  />
                </div>
              )}

              {/* Help Text */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Helper Guidance</label>
                <input
                  type="text"
                  value={selectedField.helpText || ''}
                  onChange={(e) => handleUpdateSelectedField({ helpText: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs"
                  placeholder="Appears below field"
                />
              </div>

              {/* Required & Width */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Width Layout</label>
                  <select
                    value={selectedField.width || 'half'}
                    onChange={(e) => handleUpdateSelectedField({ width: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs"
                  >
                    <option value="half">Half Width (50%)</option>
                    <option value="full">Full Width (100%)</option>
                    <option value="third">One Third (33%)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Section</label>
                  <select
                    value={selectedField.sectionId || formState.sections[0]?.id}
                    onChange={(e) => handleUpdateSelectedField({ sectionId: e.target.value })}
                    className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs"
                  >
                    {formState.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-neutral-100">
                <span className="font-semibold text-neutral-700">Mandatory / Required</span>
                <input
                  type="checkbox"
                  checked={selectedField.required}
                  onChange={(e) => handleUpdateSelectedField({ required: e.target.checked })}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
              </div>

              {/* Autofill Mapping */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1 flex items-center justify-between">
                  <span>Autofill Profile Key</span>
                  <span className="text-[10px] text-neutral-400">Intelligent</span>
                </label>
                <select
                  value={selectedField.autofillKey || ''}
                  onChange={(e) => handleUpdateSelectedField({ autofillKey: e.target.value || undefined })}
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                >
                  <option value="">(Auto-detect by label)</option>
                  <option value="fullName">Full Legal Name</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="email">Primary Email</option>
                  <option value="phone">Phone / Mobile</option>
                  <option value="dateOfBirth">Date of Birth</option>
                  <option value="address">Street Address</option>
                  <option value="city">City</option>
                  <option value="state">State / Province</option>
                  <option value="postalCode">Postal Code</option>
                  <option value="country">Country</option>
                  <option value="company">Company / Organization</option>
                  <option value="jobTitle">Job Title</option>
                  <option value="department">Department</option>
                  <option value="taxId">Tax ID / SSN</option>
                  <option value="emergencyContactName">Emergency Contact Name</option>
                  <option value="emergencyContactPhone">Emergency Contact Phone</option>
                </select>
              </div>

              {/* Options for dropdown / radio */}
              {(selectedField.type === 'dropdown' || selectedField.type === 'radio') && (
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <label className="font-semibold text-neutral-700 block">Options List</label>
                  <div className="space-y-1.5">
                    {(selectedField.options || []).map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(selectedField.options || [])];
                            newOpts[oIdx] = e.target.value;
                            handleUpdateSelectedField({ options: newOpts });
                          }}
                          className="flex-1 px-2 py-1 border border-neutral-200 rounded-md text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = (selectedField.options || []).filter((_, idx) => idx !== oIdx);
                            handleUpdateSelectedField({ options: newOpts });
                          }}
                          className="text-neutral-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = [
                          ...(selectedField.options || []),
                          `Option ${(selectedField.options?.length || 0) + 1}`,
                        ];
                        handleUpdateSelectedField({ options: newOpts });
                      }}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add Choice
                    </button>
                  </div>
                </div>
              )}

              {/* Auto ID settings */}
              {selectedField.type === 'auto_id' && (
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <label className="font-semibold text-neutral-700 block">Auto-ID Prefix</label>
                  <input
                    type="text"
                    value={selectedField.autoIdPrefix || 'ID-'}
                    onChange={(e) => handleUpdateSelectedField({ autoIdPrefix: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                    placeholder="e.g. REC-"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDuplicateField(selectedField.id)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteField(selectedField.id)}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete Field
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs text-center text-xs text-neutral-400 space-y-2">
              <Settings className="w-8 h-8 text-neutral-300 mx-auto" />
              <p>Click any field on the canvas to configure its properties, rules, and autofill bindings.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Add New Form Section</h3>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Section Title</label>
              <input
                type="text"
                autoFocus
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Employment History, Emergency Contact"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
