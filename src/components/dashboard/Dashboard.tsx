import React, { useState } from 'react';
import { User, Form, FormSubmission, Profile } from '../../types';
import { getForms, getSubmissions, getProfiles } from '../../services/storage';
import { exportSubmissionToPdf } from '../../services/exportService';
import { useToast } from '../common/Toast';
import {
  Plus,
  Upload,
  Play,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  Download,
  Sparkles,
  TrendingUp,
  FileCheck,
  Globe
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  onNavigate: (tab: any) => void;
  onCreateForm: () => void;
  onOpenPdfStudio: () => void;
  onFillForm: (form: Form) => void;
  onResumeDraft: (form: Form, submissionId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onNavigate,
  onCreateForm,
  onOpenPdfStudio,
  onFillForm,
  onResumeDraft,
}) => {
  const { showToast } = useToast();
  const forms = getForms(currentUser.id);
  const submissions = getSubmissions(currentUser.id);
  const profiles = getProfiles(currentUser.id);

  const [searchQuery, setSearchQuery] = useState('');

  // Metrics
  const completedCount = submissions.filter((s) => s.status === 'completed').length;
  const draftSubmissions = submissions.filter((s) => s.status === 'draft');
  const activeFormsCount = forms.filter((f) => f.status === 'published').length;

  const recentForms = forms.slice(0, 4);
  const recentCompleted = submissions.filter((s) => s.status === 'completed').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Accelerate repetitive paperwork with intelligent profiles, digital forms, and PDF overlay mapping.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreateForm}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Form
          </button>
          <button
            type="button"
            onClick={onOpenPdfStudio}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-500" />
            Upload / Fill PDF
          </button>
          <button
            type="button"
            onClick={() => onNavigate('templates')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Browse Templates
          </button>
          <button
            type="button"
            onClick={() => onNavigate('extension')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-100/70 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            Web Extension
          </button>
        </div>
      </div>

      {/* Metrics Row (Strict anti-slop tabular metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider">
            <span>Active Forms</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
            {activeFormsCount}
          </div>
          <div className="text-[11px] text-neutral-400">
            {forms.length} total definitions
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider">
            <span>Completed Submissions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
            {completedCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            100% verified & printable
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider">
            <span>In-Progress Drafts</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
            {draftSubmissions.length}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            Auto-saved & resumable
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold uppercase tracking-wider">
            <span>Saved Profiles</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
            {profiles.length}
          </div>
          <div className="text-[11px] text-neutral-400">
            {profiles.find((p) => p.isDefault)?.name || 'Default ready'}
          </div>
        </div>
      </div>

      {/* Clip It Web Extension Promo Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-neutral-950 text-white rounded-2xl p-4 sm:p-5 border border-blue-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/20 text-blue-300 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Clip Any Online Form When Submitted
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                Extension
              </span>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed max-w-2xl">
              Install the Clip It browser extension to automatically intercept forms on any website you submit, save their field blueprint with 1 click, and re-apply anytime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('extension')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors shadow-2xs whitespace-nowrap"
          >
            <span>Open Extension Hub & Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Draft Resume Banner if any unfinished drafts */}
      {draftSubmissions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-amber-900">
                You have {draftSubmissions.length} unfinished draft {draftSubmissions.length === 1 ? 'form' : 'forms'}
              </div>
              <p className="text-amber-700 text-[11px]">
                Resume <span className="font-medium">"{draftSubmissions[0].formTitle}"</span> right where you left off.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const sub = draftSubmissions[0];
                const form = forms.find((f) => f.id === sub.formId);
                if (form) onResumeDraft(form, sub.id);
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <span>Resume Draft</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Recently Used Forms & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Forms */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Recently Used Forms
            </span>
            <button
              type="button"
              onClick={() => onNavigate('forms')}
              className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
            >
              View all forms <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentForms.map((form) => (
              <div
                key={form.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs hover:border-neutral-300 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">
                      {form.title}
                    </span>
                    <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {form.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                    <span>{form.fields.length} fields</span>
                    <span>·</span>
                    <span>{form.submissionsCount || 0} completed</span>
                    <span>·</span>
                    <span>Modified {new Date(form.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onFillForm(form)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Fill</span>
                </button>
              </div>
            ))}

            {recentForms.length === 0 && (
              <div className="p-8 text-center bg-white border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-500 space-y-2">
                <FileText className="w-8 h-8 text-neutral-300 mx-auto" />
                <p>No forms created yet. Choose a template or create one from scratch.</p>
                <button
                  type="button"
                  onClick={onCreateForm}
                  className="text-xs font-semibold text-neutral-900 underline"
                >
                  Create Form
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Completed Records */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Completed Records
            </span>
            <button
              type="button"
              onClick={() => onNavigate('completed')}
              className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
            >
              See all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentCompleted.map((sub) => {
              const form = forms.find((f) => f.id === sub.formId);

              return (
                <div
                  key={sub.id}
                  className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs hover:border-neutral-300 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-neutral-900 truncate">
                      {sub.formTitle}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      {sub.profileNameUsed || 'Direct Input'} · {new Date(sub.completedAt || sub.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {form && (
                    <button
                      type="button"
                      onClick={() => {
                        exportSubmissionToPdf(form, sub, currentUser.organization);
                        showToast('PDF Exported', `${form.title} submission`);
                      }}
                      className="shrink-0 p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {recentCompleted.length === 0 && (
              <div className="p-8 text-center bg-white border border-dashed border-neutral-200 rounded-2xl text-xs text-neutral-400">
                No completed submissions yet.
              </div>
            )}
          </div>

          {/* Quick Profile Snapshot */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800">Autofill Profile Status</span>
              <button
                type="button"
                onClick={() => onNavigate('profiles')}
                className="text-[11px] font-semibold text-neutral-900 hover:underline"
              >
                Manage
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Active profile: <span className="font-semibold text-neutral-800">{profiles.find((p) => p.isDefault)?.name || 'Default'}</span> ({profiles.length} profiles configured).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
