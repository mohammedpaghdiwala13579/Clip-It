import React, { useState } from 'react';
import { Form, User } from '../../types';
import { getForms, deleteForm, duplicateForm, saveForm, getSubmissions } from '../../services/storage';
import { exportFormToCsv } from '../../services/exportService';
import { useToast } from '../common/Toast';
import {
  FileText,
  Search,
  Plus,
  Play,
  Edit3,
  Copy,
  Archive,
  Trash2,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArchiveX
} from 'lucide-react';

interface FormsManagerProps {
  currentUser: User;
  onCreateNewForm: () => void;
  onEditForm: (form: Form) => void;
  onFillForm: (form: Form) => void;
}

export const FormsManager: React.FC<FormsManagerProps> = ({
  currentUser,
  onCreateNewForm,
  onEditForm,
  onFillForm,
}) => {
  const { showToast } = useToast();
  const [forms, setForms] = useState<Form[]>(() => getForms(currentUser.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'submissions'>('updated');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and sort
  const filteredForms = forms
    .filter((f) => {
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'submissions') return (b.submissionsCount || 0) - (a.submissionsCount || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleDuplicate = (id: string) => {
    const copy = duplicateForm(id, currentUser.id);
    if (copy) {
      setForms(getForms(currentUser.id));
      showToast('Form Duplicated', `Created "${copy.title}"`);
    }
  };

  const handleToggleArchive = (form: Form) => {
    const nextStatus = form.status === 'archived' ? 'published' : 'archived';
    const updated: Form = { ...form, status: nextStatus };
    saveForm(updated);
    setForms(getForms(currentUser.id));
    showToast(
      nextStatus === 'archived' ? 'Form Archived' : 'Form Restored',
      `"${form.title}" is now ${nextStatus}.`
    );
  };

  const handleDelete = (id: string) => {
    deleteForm(id);
    setForms(getForms(currentUser.id));
    setDeleteConfirmId(null);
    showToast('Form Deleted', 'The form was permanently removed.');
  };

  const handleExportCsv = (form: Form) => {
    const subs = getSubmissions(currentUser.id).filter((s) => s.formId === form.id);
    exportFormToCsv(form, subs);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">My Digital Forms</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create, customize, fill, and manage all your team and personal documents.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNewForm}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Form
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'all' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({forms.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'published' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Published ({forms.filter((f) => f.status === 'published').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'draft' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Drafts ({forms.filter((f) => f.status === 'draft').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'archived' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Archived ({forms.filter((f) => f.status === 'archived').length})
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forms..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-600">
            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border-none bg-transparent text-xs text-neutral-800 font-medium focus:outline-none"
            >
              <option value="updated">Recent</option>
              <option value="title">Title (A-Z)</option>
              <option value="submissions">Submissions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForms.map((form) => (
          <div
            key={form.id}
            className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">{form.category}</span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    form.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : form.status === 'draft'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {form.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                  {form.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1 font-mono text-[11px]">
                <span>{form.fields.length} fields</span>
                <span aria-hidden="true">·</span>
                <span>{form.submissionsCount || 0} submissions</span>
                <span aria-hidden="true">·</span>
                <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditForm(form)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors"
                  title="Edit in builder"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(form.id)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors"
                  title="Duplicate form"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(form)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors"
                  title="Export submissions CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleArchive(form)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors"
                  title={form.status === 'archived' ? 'Restore form' : 'Archive form'}
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(form.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete form"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onFillForm(form)}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Fill Form</span>
              </button>
            </div>
          </div>
        ))}

        {filteredForms.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500 space-y-2">
            <FileText className="w-8 h-8 text-neutral-300 mx-auto" />
            <p>No forms found matching your criteria.</p>
            <button
              type="button"
              onClick={onCreateNewForm}
              className="text-xs font-semibold text-neutral-900 underline"
            >
              Create your first form now
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Delete Form?</h3>
            <p className="text-xs text-neutral-600">
              Are you sure you want to permanently delete this form? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
