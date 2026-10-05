import React, { useState } from 'react';
import { User } from '../../types';
import { loginUser, signupUser, getAllUsers, setCurrentUser } from '../../services/storage';
import { useToast } from '../common/Toast';
import { UserCheck, Shield, KeyRound, Mail, ArrowRight, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserChange: (user: User) => void;
  initialMode?: 'login' | 'signup' | 'profile';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  initialMode = 'login',
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'profile'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = loginUser(email);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to sign in.');
      return;
    }
    onUserChange(res.user);
    showToast('Signed in successfully', `Welcome back, ${res.user.name}`);
    onClose();
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Please enter both your name and email address.');
      return;
    }
    const res = signupUser(name, email, 'user');
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to create account.');
      return;
    }
    onUserChange(res.user);
    showToast('Account created', `Welcome to Clip It, ${res.user.name}!`);
    onClose();
  };

  const handleQuickSwitch = (u: User) => {
    setCurrentUser(u);
    onUserChange(u);
    showToast('Switched Account', `Now active as ${u.name} (${u.role.toUpperCase()})`);
    onClose();
  };

  const allUsers = getAllUsers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'profile' ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-base">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 leading-tight">{currentUser.name}</h3>
                <p className="text-xs text-neutral-500 font-mono">{currentUser.email}</p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Account Role</span>
                <span className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px] bg-neutral-200 px-2 py-0.5 rounded">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Organization</span>
                <span className="font-medium text-neutral-800">{currentUser.organization || 'Independent'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Member Since</span>
                <span className="font-medium text-neutral-800">
                  {new Date(currentUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-2">
                Quick Switch Test User (Simulated Accounts)
              </label>
              <div className="space-y-1.5">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSwitch(u)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      u.id === currentUser.id
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{u.name}</span>
                      <span className={`ml-2 text-[10px] ${u.id === currentUser.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        ({u.role})
                      </span>
                    </div>
                    {u.id === currentUser.id && <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-neutral-600 hover:text-neutral-900 underline"
              >
                Sign in to another account
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : mode === 'forgot' ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Reset Your Password</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Enter your registered email address to receive password recovery instructions.
              </p>
            </div>

            {forgotSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs space-y-2">
                <p className="font-semibold">Reset instructions sent!</p>
                <p>We've dispatched a secure verification link to {email}. Check your inbox.</p>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="mt-2 text-xs font-semibold underline text-emerald-900 block"
                >
                  Return to sign in
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setForgotSuccess(true);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Send Recovery Link
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-neutral-500 hover:text-neutral-900 mt-2 block"
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        ) : mode === 'login' ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Sign In to Clip It</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Access your digital forms, reusable profiles, and verified submissions.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
              >
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {allUsers.length > 0 && (
              <>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-neutral-400">Available Accounts</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSwitch(u)}
                      className="w-full p-2 border border-neutral-200 hover:border-neutral-900 rounded-lg text-left text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">{u.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="text-center pt-2">
              <span className="text-xs text-neutral-500">Don't have an account? </span>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs font-semibold text-neutral-900 hover:underline"
              >
                Create one now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Create New Account</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Start building digital forms and storing reusable autofill profiles.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Taylor Smith"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taylor@company.com"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create secure password"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Create Account & Initialize Profile
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-neutral-500">Already registered? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-semibold text-neutral-900 hover:underline"
              >
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
