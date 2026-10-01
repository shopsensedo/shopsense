import React, { useState, useEffect } from 'react';
import { Bell, Check, TrendingDown } from 'lucide-react';
import { Product } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { formatPKR } from '../ui/PriceTag';
import { useToast } from '../ui/Toast';

interface PriceAlertModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSetAlert: (product: Product, targetPrice: number) => void;
  isUrduMode?: boolean;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  product,
  isOpen,
  onClose,
  onSetAlert,
  isUrduMode = false,
}) => {
  const { showToast } = useToast();
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'push'>('whatsapp');
  const [contact, setContact] = useState('');

  // Reset the form each time the modal opens (fresh product context)
  useEffect(() => {
    if (isOpen) {
      setTargetPrice('');
      setChannel('whatsapp');
      setContact('');
    }
  }, [isOpen]);

  if (!product) return null;

  const currentPrice = product.price;
  const suggestedTarget = Math.round(currentPrice * 0.85); // 15% discount target

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(targetPrice) || suggestedTarget;
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid target price greater than zero', 'warning');
      return;
    }
    if (priceNum >= currentPrice) {
      showToast('Target price should be lower than current price', 'warning');
      return;
    }
    if (channel !== 'push' && contact.trim() === '') {
      showToast(
        channel === 'whatsapp'
          ? 'Please enter your WhatsApp number to receive alerts'
          : 'Please enter your email address to receive alerts',
        'warning'
      );
      return;
    }
    onSetAlert(product, priceNum);
    showToast(`Price alert set! We will notify you when price drops below ${formatPKR(priceNum)}`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUrduMode ? 'Qeemat Alert Set Karein' : 'Track Price Drop'}
      subtitle={product.title}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Current Price vs Target */}
        <div className="p-3 bg-slate-50 dark:bg-[#262626] rounded-xl border border-slate-200 dark:border-[#333333] flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Current PKR Price</span>
            <div className="text-base font-bold text-[#0C0C0C] dark:text-[#F5F5F5]">{formatPKR(currentPrice)}</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80] bg-emerald-50 dark:bg-[#052E16] px-2.5 py-1 rounded-md border border-emerald-200 dark:border-[#166534]">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Target -15%: {formatPKR(suggestedTarget)}</span>
          </div>
        </div>

        {/* Input Target */}
        <FormInput
          label="Your Target Price (PKR)"
          type="number"
          placeholder={suggestedTarget.toString()}
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          hint="We will scan Daraz, Telemart, Bagallery & local stores daily."
        />

        {/* Alert Channel */}
        <div>
          <label className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] block mb-1.5">
            How should we notify you?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'email', label: 'Email' },
              { id: 'push', label: 'In-App' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannel(ch.id as any)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  channel === ch.id
                    ? 'border-[#0C0C0C] dark:border-[#B9C006] bg-[#F2F4D6] dark:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#CDD835]'
                    : 'border-slate-200 dark:border-[#333333] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {channel !== 'push' && (
          <FormInput
            label={channel === 'whatsapp' ? 'WhatsApp Phone Number' : 'Email Address'}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={channel === 'whatsapp' ? '+92 300 0000000' : 'name@example.com'}
          />
        )}

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" leftIcon={<Bell className="w-4 h-4" />}>
            Activate Alert
          </Button>
        </div>
      </form>
    </Modal>
  );
};
