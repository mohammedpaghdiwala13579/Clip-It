import React, { useState } from 'react';
import { FormSubmission, Form, User } from '../../types';
import { getSubmissions, getForms, deleteSubmission, saveSubmission } from '../../services/storage';
import { exportSubmissionToPdf, exportFormToCsv } from '../../services/exportService';
import { useToast } from '../common/Toast';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Copy,
  Printer,
  Share2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';

interface CompletedFormsViewProps {
  currentUser: User;
  onResumeDraft: (form: Form, submissionId: string) => void;
  onRefillForm: (form: Form) => void;
}

export const CompletedFormsView: React.FC<CompletedFormsViewProps> = ({
  currentUser,
  onResumeDraft,
  onRefillForm,
}) => {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<FormSubmission[]>(() =>
    getSubmissions(currentUser.id)
  );
  const forms = getForms(currentUser.id);

  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [shareModalSub, setShareModalSub] = useState<FormSubmission | null>(null);

  const filtered = submissions.filter((s) => {
    const matchesTab = activeTab === 'all' || s.status === activeTab;
    const matchesSearch =
      !searchQuery.trim() ||
      s.formTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.profileNameUsed && s.profileNameUsed.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleDelete = (id: string) => {
    deleteSubmission(id);
    const updated = getSubmissions(currentUser.id);
    setSubmissions(updated);
    if (selectedSubmission?.id === id) setSelectedSubmission(null);
    showToast('Record Deleted', 'Submission was permanently deleted.');
  };

  const handleDuplicateSubmission = (sub: FormSubmission) => {
    const newSub: FormSubmission = {
      ...sub,
      id: `sub_${Date.now()}`,
      status: 'draft',
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSubmission(newSub);
    const updated = getSubmissions(currentUser.id);
    setSubmissions(updated);
    showToast('Submission Duplicated', 'Created new draft with existing response values.');
  };

  const handleDownloadPdf = (sub: FormSubmission) => {
    const form = forms.find((f) => f.id === sub.formId);
    if (!form) {
      showToast('Form Not Found', 'Original form definition not found for this submission.', 'error');
      return;
    }
    exportSubmissionToPdf(form, sub, currentUser.organization);
    showToast('PDF Exported', `${form.title} submission document downloaded.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Completed Records & Drafts</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your verified submissions, export official PDFs, or resume unfinished drafts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or ID..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Records ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'completed' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Completed ({submissions.filter((s) => s.status === 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'draft' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Drafts ({submissions.filter((s) => s.status === 'draft').length})
          </button>
        </div>
      </div>

      {/* Submissions Table / List */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Form Title & ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Autofill Profile</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((sub) => {
                const form = forms.find((f) => f.id === sub.formId);

                return (
                  <tr key={sub.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{sub.formTitle}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Ref: {sub.id} · {Object.keys(sub.data || {}).length} responses
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {sub.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                            <Clock className="w-3 h-3" /> Draft ({sub.progressPercentage || 40}%)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-neutral-700 font-medium">
                        {sub.profileNameUsed || 'Direct Input'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(sub.completedAt || sub.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === 'draft' && form ? (
                          <button
                            type="button"
                            onClick={() => onResumeDraft(form, sub.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                          >
                            <span>Resume</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedSubmission(sub)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(sub)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setShareModalSub(sub)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Share verification record"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateSubmission(sub)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Duplicate responses into new draft"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(sub.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-neutral-400">
                    No records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Verified Submission Record
                </span>
                <h3 className="text-base font-bold text-neutral-900">{selectedSubmission.formTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px]">SUBMISSION ID</span>
                <span className="font-mono font-semibold text-neutral-800">{selectedSubmission.id}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">RECORD DATE</span>
                <span className="font-medium text-neutral-800">
                  {new Date(selectedSubmission.completedAt || selectedSubmission.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">PROFILE SOURCE</span>
                <span className="font-medium text-neutral-800">{selectedSubmission.profileNameUsed || 'Direct Input'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">STATUS</span>
                <span className="font-semibold text-emerald-600 uppercase text-[11px]">
                  {selectedSubmission.status}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                Submitted Field Responses
              </span>

              {Object.entries(selectedSubmission.data).map(([fieldKey, val]) => (
                <div key={fieldKey} className="p-2.5 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs">
                  <div className="text-[11px] text-neutral-500 font-mono">{fieldKey}</div>
                  <div className="font-semibold text-neutral-900 mt-0.5">
                    {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '—')}
                  </div>
                </div>
              ))}

              {selectedSubmission.signatureDataUrl && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="text-xs font-semibold text-neutral-700 block">Captured Digital Signature</span>
                  <img
                    src={selectedSubmission.signatureDataUrl}
                    alt="Signature"
                    className="h-16 object-contain bg-white rounded border border-neutral-200 p-1"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleDownloadPdf(selectedSubmission)}
                className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Share Submission Link</h3>
            <p className="text-xs text-neutral-600">
              Shareable verification reference for <span className="font-semibold">{shareModalSub.formTitle}</span>.
            </p>
            <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono text-neutral-700 break-all select-all">
              {window.location.origin}/verify/{shareModalSub.id}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShareModalSub(null)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/verify/${shareModalSub.id}`);
                  showToast('Link Copied', 'Verification URL copied to clipboard');
                  setShareModalSub(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
