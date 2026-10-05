import React, { useState } from 'react';
import { User } from '../../types';
import { exportAllUserData, deleteUserAccount, resetToDemo } from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Key,
  UserCheck,
  Check
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  onUserDeleted: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUserDeleted }) => {
  const { showToast } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleExportData = () => {
    const jsonStr = exportAllUserData(currentUser.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipit_${currentUser.email}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Data Exported', 'Full JSON archive downloaded successfully.');
  };

  const handleConfirmDelete = () => {
    if (confirmInput.toUpperCase() !== 'DELETE') {
      showToast('Confirmation Required', 'Please type DELETE into the confirmation box.', 'error');
      return;
    }
    deleteUserAccount(currentUser.id);
    showToast('Account Deleted', 'All forms, profiles, and submissions were wiped.');
    onUserDeleted();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-neutral-200">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Account & Security Settings</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Review data isolation policies, export all records, or manage sensitive credentials.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Account Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-neutral-400 block mb-0.5">FULL LEGAL NAME</span>
            <span className="font-semibold text-neutral-900">{currentUser.name}</span>
          </div>
          <div>
            <span className="text-neutral-400 block mb-0.5">EMAIL ADDRESS</span>
            <span className="font-mono text-neutral-900">{currentUser.email}</span>
          </div>
          <div>
            <span className="text-neutral-400 block mb-0.5">ORGANIZATION</span>
            <span className="text-neutral-900">{currentUser.organization || 'Independent Professional'}</span>
          </div>
          <div>
            <span className="text-neutral-400 block mb-0.5">SYSTEM PRIVILEGES</span>
            <span className="uppercase font-semibold text-neutral-800 text-[11px] bg-neutral-100 px-2 py-0.5 rounded inline-block">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Data Isolation Guarantees */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Privacy & Security Architecture
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-3">
            <Lock className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-neutral-900">Zero Cross-User Data Exposure</div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Forms, drafts, reusable profiles, and digital signatures are strictly segregated by your unique user identifier (<span className="font-mono">{currentUser.id}</span>). Other accounts cannot access your private data.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-start gap-3">
            <Key className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-neutral-900">Sensitive Information Masking</div>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Tax IDs, National IDs, and SSNs in autofill profiles are encrypted and masked when stored, requiring explicit user initiation before population.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
          Data Portability & Backup
        </h3>
        <p className="text-xs text-neutral-500">
          Download a complete portable JSON archive containing all your profiles, form definitions, and verified submission records.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export My Data (JSON)
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset application state to original demo templates and seed users?')) {
                resetToDemo();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            Reset to Demo Seeds
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="text-xs text-neutral-600">
          Permanently delete this account. All forms, responses, signatures, and personal autofill profiles will be erased immediately.
        </p>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Account & Wipe Data
        </button>
      </div>

      {/* Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Permanently Delete Account?</h3>
            <p className="text-xs text-neutral-600">
              This action cannot be undone. To verify, please type <span className="font-mono font-bold text-red-600">DELETE</span> in the box below:
            </p>
            <input
              type="text"
              autoFocus
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-red-600 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setConfirmInput('');
                }}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={confirmInput.toUpperCase() !== 'DELETE'}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
