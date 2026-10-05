import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  User,
  Form,
  FormSubmission
} from './types';
import {
  initStorage,
  getCurrentUser,
  setCurrentUser,
  getForms,
  getForm
} from './services/storage';
import { ToastProvider, useToast } from './components/common/Toast';
import { Dashboard } from './components/dashboard/Dashboard';
import { FormsManager } from './components/forms/FormsManager';
import { FormBuilder } from './components/builder/FormBuilder';
import { FormFiller } from './components/filler/FormFiller';
import { TemplateLibrary } from './components/templates/TemplateLibrary';
import { ProfileManager } from './components/profiles/ProfileManager';
import { CompletedFormsView } from './components/submissions/CompletedFormsView';
import { PdfDocumentStudio } from './components/pdf/PdfDocumentStudio';
import { SettingsView } from './components/settings/SettingsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { ExtensionHub } from './components/extension/ExtensionHub';
import { AuthModal } from './components/auth/AuthModal';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  UserSquare2,
  CheckCircle2,
  FileSignature,
  Settings,
  Shield,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Plus
} from 'lucide-react';

// Initialize storage seeds
initStorage();

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

function MainApp() {
  const { showToast } = useToast();
  const [currentUser, setUser] = useState<User>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavigationTab | 'builder' | 'filler'>('dashboard');

  // Active form for builder or filler
  const [activeForm, setActiveForm] = useState<Form | null>(null);
  const [resumeSubmissionId, setResumeSubmissionId] = useState<string | undefined>(undefined);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'profile'>('profile');

  // Listen for storage auth changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      if (e.detail) setUser(e.detail);
    };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  // Handlers for switching views
  const handleCreateNewForm = () => {
    setActiveForm(null);
    setActiveTab('builder');
  };

  const handleEditForm = (form: Form) => {
    setActiveForm(form);
    setActiveTab('builder');
  };

  const handleFillForm = (form: Form) => {
    setActiveForm(form);
    setResumeSubmissionId(undefined);
    setActiveTab('filler');
  };

  const handleResumeDraft = (form: Form, subId: string) => {
    setActiveForm(form);
    setResumeSubmissionId(subId);
    setActiveTab('filler');
  };

  const handleUseTemplate = (form: Form) => {
    setActiveForm(form);
    setActiveTab('builder');
  };

  const handleFillTemplate = (form: Form) => {
    setActiveForm(form);
    setResumeSubmissionId(undefined);
    setActiveTab('filler');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* 
        Top Navigation Bar
        Follows the strict One-Row, Three-Zone Top Bar Contract:
        [Brand Title] — [Clean Nav Links] — [Primary Actions / Profile]
      */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Single text wordmark in display style */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-base font-bold tracking-tight text-neutral-900 hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-black">
                C
              </span>
              <span>Clip It</span>
            </button>
          </div>

          {/* Zone 2: Clean unboxed nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'dashboard' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('forms')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'forms' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Forms
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'templates' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Templates
            </button>

            <button
              onClick={() => setActiveTab('profiles')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'profiles' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Profiles
            </button>

            <button
              onClick={() => setActiveTab('pdf-studio')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'pdf-studio' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              PDF Studio
            </button>

            <button
              onClick={() => setActiveTab('extension')}
              className={`transition-colors hover:text-neutral-900 flex items-center gap-1 ${
                activeTab === 'extension' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse"></span>
              Extension
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'completed' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Completed
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`transition-colors hover:text-neutral-900 ${
                activeTab === 'settings' ? 'text-neutral-900 font-bold underline underline-offset-8 decoration-2 decoration-neutral-900' : ''
              }`}
            >
              Settings
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`transition-colors hover:text-indigo-600 flex items-center gap-1 ${
                  activeTab === 'admin' ? 'text-indigo-700 font-bold underline underline-offset-8 decoration-2 decoration-indigo-700' : 'text-neutral-500'
                }`}
              >
                <Shield className="w-3 h-3 text-indigo-600" />
                Admin
              </button>
            )}
          </nav>

          {/* Zone 3: Primary action & User Profile */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCreateNewForm}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>New Form</span>
            </button>

            {/* Profile trigger button */}
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('profile');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-2 p-1 pl-2 bg-neutral-100 hover:bg-neutral-200/80 rounded-xl text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-neutral-800 hidden sm:inline max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400 mr-1" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center gap-1 px-3 py-1.5 overflow-x-auto border-t border-neutral-100 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'forms' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Forms
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'templates' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'profiles' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab('pdf-studio')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'pdf-studio' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            PDF Studio
          </button>
          <button
            onClick={() => setActiveTab('extension')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'extension' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Extension
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'completed' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'settings' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'}`}
          >
            Settings
          </button>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onCreateForm={handleCreateNewForm}
            onOpenPdfStudio={() => setActiveTab('pdf-studio')}
            onFillForm={handleFillForm}
            onResumeDraft={handleResumeDraft}
          />
        )}

        {activeTab === 'forms' && (
          <FormsManager
            currentUser={currentUser}
            onCreateNewForm={handleCreateNewForm}
            onEditForm={handleEditForm}
            onFillForm={handleFillForm}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateLibrary
            currentUser={currentUser}
            onUseTemplate={handleUseTemplate}
            onFillTemplate={handleFillTemplate}
          />
        )}

        {activeTab === 'profiles' && (
          <ProfileManager currentUser={currentUser} />
        )}

        {activeTab === 'completed' && (
          <CompletedFormsView
            currentUser={currentUser}
            onResumeDraft={handleResumeDraft}
            onRefillForm={handleFillForm}
          />
        )}

        {activeTab === 'pdf-studio' && (
          <PdfDocumentStudio
            currentUser={currentUser}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'extension' && (
          <ExtensionHub
            currentUser={currentUser}
            onOpenFormInBuilder={(form) => {
              setActiveForm(form);
              setActiveTab('builder');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onUserDeleted={() => {
              setUser(getCurrentUser());
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel currentUser={currentUser} />
        )}

        {activeTab === 'builder' && (
          <FormBuilder
            currentUser={currentUser}
            initialForm={activeForm || undefined}
            onBack={() => setActiveTab('forms')}
            onSaveSuccess={(saved) => {
              setActiveForm(saved);
              setActiveTab('forms');
            }}
            onPreviewFill={(previewForm) => {
              setActiveForm(previewForm);
              setActiveTab('filler');
            }}
          />
        )}

        {activeTab === 'filler' && activeForm && (
          <FormFiller
            form={activeForm}
            currentUser={currentUser}
            resumeSubmissionId={resumeSubmissionId}
            onBack={() => setActiveTab('dashboard')}
            onComplete={() => {
              showToast('Success', 'Form submission finalized.');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-5 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-900">Clip It</span>
            <span>·</span>
            <span>Universal web form clipper, autofill engine & document studio</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span>Enterprise Multi-Tenant</span>
            <span>·</span>
            <span className="font-mono text-neutral-600">v1.2.0-stable</span>
          </div>
        </div>
      </footer>

      {/* Auth & Switcher Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        initialMode={authModalMode}
        onUserChange={(newUser) => {
          setUser(newUser);
          setCurrentUser(newUser);
        }}
      />
    </div>
  );
}
