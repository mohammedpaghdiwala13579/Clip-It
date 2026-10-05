import React, { useState } from 'react';
import { Template, TemplateCategory, Form, User } from '../../types';
import { getTemplates, saveForm } from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  Search,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  Plus,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';

interface TemplateLibraryProps {
  currentUser: User;
  onUseTemplate: (form: Form) => void;
  onFillTemplate: (form: Form) => void;
}

const CATEGORIES: Array<'All' | TemplateCategory> = [
  'All',
  'Applications',
  'Invoices',
  'Registration forms',
  'Employee forms',
  'Customer forms',
  'School forms',
  'Business forms',
  'Contact forms',
];

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  currentUser,
  onUseTemplate,
  onFillTemplate,
}) => {
  const { showToast } = useToast();
  const [templates] = useState<Template[]>(() => getTemplates());
  const [selectedCategory, setSelectedCategory] = useState<'All' | TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCloneTemplate = (tpl: Template, mode: 'customize' | 'fill') => {
    const now = new Date().toISOString();
    const clonedForm: Form = {
      id: `form_${Date.now()}`,
      userId: currentUser.id,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      status: 'draft',
      isTemplate: false,
      sections: JSON.parse(JSON.stringify(tpl.sections)),
      fields: JSON.parse(JSON.stringify(tpl.fields)),
      submissionsCount: 0,
      createdAt: now,
      updatedAt: now,
      tags: [...tpl.tags],
    };

    saveForm(clonedForm);
    showToast('Template Added', `Created form from "${tpl.title}"`);

    if (mode === 'customize') {
      onUseTemplate(clonedForm);
    } else {
      onFillTemplate(clonedForm);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Form Template Library</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Production-ready form layouts with pre-mapped autofill attributes and validation rules.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or tags..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              selectedCategory === cat
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-700 tracking-wide">{tpl.category}</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-neutral-400" /> {tpl.estimatedFillTime}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              {/* Tags and fields count */}
              <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  {tpl.fields.length} fields
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">{tpl.sections.length} sections</span>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] text-emerald-600 font-medium">Autofill ready</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(tpl)}
                className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 py-1.5 px-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-400" /> Preview
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCloneTemplate(tpl, 'customize')}
                  className="px-2.5 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={() => handleCloneTemplate(tpl, 'fill')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  <span>Fill Form</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500">
            No templates found matching your search. Try adjusting the category or search query.
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  {previewTemplate.category}
                </span>
                <h3 className="text-base font-bold text-neutral-900">{previewTemplate.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">{previewTemplate.description}</p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {previewTemplate.sections.map((sec) => {
                const secFields = previewTemplate.fields.filter(
                  (f) => f.sectionId === sec.id || (!f.sectionId && sec.id === previewTemplate.sections[0]?.id)
                );

                return (
                  <div key={sec.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">{sec.title}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {secFields.map((f) => (
                        <div key={f.id} className="p-2 bg-white rounded-lg border border-neutral-200">
                          <div className="font-semibold text-neutral-800 flex items-center justify-between">
                            <span>{f.label}</span>
                            {f.required && <span className="text-red-500 text-[10px]">*</span>}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Type: {f.type} {f.autofillKey ? `· maps to ${f.autofillKey}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  handleCloneTemplate(t, 'fill');
                }}
                className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                Use & Fill Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
