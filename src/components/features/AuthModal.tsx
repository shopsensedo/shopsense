import React, { useEffect, useState } from 'react';
import { Camera, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { User } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { useToast } from '../ui/Toast';
import {
  AuthError,
  BackendUnavailableError,
  isBackendReachable,
  login as apiLogin,
  register as apiRegister,
  type BackendUser,
} from '../../lib/authClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onContinueGuest: () => void;
  isUrduMode?: boolean;
}

function toAppUser(u: BackendUser, isUrduMode: boolean): User {
  return {
    id: `backend-${u.id}`,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    isGuest: false,
    preferredLanguage: isUrduMode ? 'ur' : 'en',
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onContinueGuest,
  isUrduMode = false,
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 'checking' | 'up' | 'down' — when the account server is not reachable
  // the form is clearly labelled Demo and sign-in is disabled.
  const [backend, setBackend] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    if (!isOpen) return;
    setBackend('checking');
    let cancelled = false;
    isBackendReachable().then((ok) => {
      if (!cancelled) setBackend(ok ? 'up' : 'down');
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const demoNoBackend = backend === 'down';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    try {
      // Real account against the ShopSense backend — no mock user.
      const backendUser =
        mode === 'signup'
          ? await apiRegister(email.trim(), password, name.trim())
          : await apiLogin(email.trim(), password);
      onLoginSuccess(toAppUser(backendUser, isUrduMode));
      showToast(
        mode === 'signup'
          ? 'Account created successfully! Welcome to ShopSense.'
          : 'Signed in successfully!',
        'success'
      );
      onClose();
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setError(
          isUrduMode
            ? 'Account server se rabta nahi ho saka. Guest ke tor par jari rakhen — saved items isi device par rahen gi.'
            : `${err.message} You can continue as a guest.`
        );
      } else if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      isBottomSheetOnMobile={true}
    >
      <div className="text-center mb-6 pt-1">
        <div className="w-12 h-12 rounded-2xl bg-[#F2F4D6] dark:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#B9C006] flex items-center justify-center mx-auto mb-3">
          <Camera className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading">
          {mode === 'signin' ? 'Sign In to ShopSense' : 'Create Free Account'}
        </h2>
        <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-1 max-w-xs mx-auto">
          {isUrduMode
            ? 'Saved items aur price alerts apke account me sync hon ge.'
            : 'Your saved items and price alerts sync to your account.'}
        </p>
      </div>

      {demoNoBackend && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200"
        >
          <span className="font-bold">Demo — </span>
          {isUrduMode
            ? 'Account server connected nahi hai, is liye sign-in band hai. Guest ke tor par jari rakhen — saved items isi device par rahen gi.'
            : 'No account server is connected, so sign-in is disabled. Continue as a guest — saved items stay on this device.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'signup' && (
          <FormInput
            label="Full Name"
            placeholder="e.g. Hamza Farooq"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <FormInput
          label="Email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error || undefined}
        />

        <FormInput
          label="Password"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          disabled={busy || demoNoBackend}
        >
          {busy ? (
            'Please wait…'
          ) : mode === 'signin' ? (
            <>
              Sign In <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Switch mode */}
      <div className="mt-4 text-center text-xs text-[#5F5F60] dark:text-[#9C9C9D]">
        {mode === 'signin' ? (
          <span>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="text-[#0C0C0C] dark:text-[#B9C006] font-semibold hover:underline"
            >
              Sign up
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-[#0C0C0C] dark:text-[#B9C006] font-semibold hover:underline"
            >
              Sign in
            </button>
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-[#333333]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-[#1A1A1A] px-2 text-[#9C9C9D] font-medium">Or</span>
        </div>
      </div>

      {/* Continue as Guest Button */}
      <button
        type="button"
        onClick={() => {
          onContinueGuest();
          onClose();
        }}
        className="w-full h-11 rounded-xl border border-slate-200 dark:border-[#333333] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#262626] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <UserCheck className="w-4 h-4 text-slate-400" />
        <span>Continue as Guest</span>
      </button>
    </Modal>
  );
};
