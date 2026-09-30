import React, { useState } from 'react';
import { Camera, Lock, Mail, Phone, ArrowRight, UserCheck } from 'lucide-react';
import { User } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onContinueGuest: () => void;
  isUrduMode?: boolean;
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
  const [identifier, setIdentifier] = useState('03001234567');
  const [name, setName] = useState('Hamza Farooq');
  const [password, setPassword] = useState('pakistan2026');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your Pakistani mobile number or email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Mock successful login
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: mode === 'signup' ? name || 'ShopSense User' : 'Hamza Farooq',
      email: identifier.includes('@') ? identifier : 'user@shopsense.pk',
      phone: identifier.includes('@') ? '+92 300 1234567' : identifier,
      isGuest: false,
      preferredLanguage: isUrduMode ? 'ur' : 'en',
    };

    onLoginSuccess(newUser);
    showToast(
      mode === 'signup' ? 'Account created successfully! Welcome to ShopSense.' : 'Signed in successfully!',
      'success'
    );
    onClose();
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
            ? 'Daraz aur local dukaano se bachat aur WhatsApp price alerts ke liye dakhil hon.'
            : 'Sync saved items and get instant WhatsApp price drop alerts across Daraz & local stores.'}
        </p>
      </div>

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
          label="Pakistani Mobile or Email"
          placeholder="0300 1234567 or email@domain.com"
          leftIcon={<Phone className="w-4 h-4" />}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
        >
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
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
