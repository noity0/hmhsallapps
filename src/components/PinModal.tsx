import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound, AlertCircle, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  subtitle?: string;
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_SECONDS = 60;

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Owner Security Verification',
  subtitle = 'Enter owner passcode to access administrative controls',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDigits, setShowDigits] = useState(false);

  // Security Lockout State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Check existing lockout on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsSuccess(false);
      setShowDigits(false);

      // Check stored lockout time in sessionStorage
      const savedLockout = sessionStorage.getItem('owner_lockout_until');
      if (savedLockout) {
        const lockoutUntil = parseInt(savedLockout, 10);
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutRemaining(remaining);
        } else {
          sessionStorage.removeItem('owner_lockout_until');
          setLockoutRemaining(0);
        }
      }

      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem('owner_lockout_until');
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const verifyPinValue = async (code: string) => {
    if (code.length < 4 || isVerifying || lockoutRemaining > 0) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
        setFailedAttempts(0);
        sessionStorage.removeItem('owner_lockout_until');

        setTimeout(() => {
          onSuccess(code);
          onClose();
        }, 350);
        return;
      }

      // If server locked out
      if (res.status === 429 || data.lockedOut) {
        const secs = data.remainingSecs || LOCKOUT_DURATION_SECONDS;
        setLockoutRemaining(secs);
        sessionStorage.setItem('owner_lockout_until', String(Date.now() + secs * 1000));
        setError(`Security Lockout: Too many failed attempts. Locked for ${secs}s.`);
        setPin('');
        return;
      }

      // Client-side attempt tracking
      const newFailed = failedAttempts + 1;
      setFailedAttempts(newFailed);

      if (newFailed >= MAX_FAILED_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        sessionStorage.setItem('owner_lockout_until', String(lockoutTime));
        setLockoutRemaining(LOCKOUT_DURATION_SECONDS);
        setError(`Security Lockout: ${MAX_FAILED_ATTEMPTS} incorrect attempts. Locked for ${LOCKOUT_DURATION_SECONDS}s.`);
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - newFailed;
        setError(`Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }

      setPin('');
    } catch {
      // Offline fallback: verify cryptographic hash (no plaintext PIN exposed)
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        if (hashHex === '81e3115919b4a97b3a2d74945e11f722782beabd40af734e2a2e8266fb2c9542') {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess('verified_auth');
            onClose();
          }, 350);
          return;
        }
      } catch {
        // ignore
      }
      setError('Incorrect passcode. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 4 || isSuccess || lockoutRemaining > 0) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length === 4) {
      verifyPinValue(nextPin);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !isSuccess && lockoutRemaining === 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && pin.length === 4) {
      verifyPinValue(pin);
    }
  };

  if (!isOpen) return null;

  const isLocked = lockoutRemaining > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 text-slate-100"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
              isLocked
                ? 'bg-rose-500/10 border border-rose-500/30'
                : isSuccess
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-amber-400/10 border border-amber-400/20'
            }`}>
              {isLocked ? (
                <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <KeyRound className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Hidden input for keyboard support */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            disabled={isLocked || isVerifying || isSuccess}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              if (val.length === 4) verifyPinValue(val);
            }}
            onKeyDown={handleKeyDown}
            className="sr-only"
            autoFocus
          />

          {/* Masked PIN Indicators with Peek Option */}
          <div className="flex flex-col items-center mb-6">
            <div
              onClick={() => !isLocked && inputRef.current?.focus()}
              className="flex items-center justify-center gap-3 cursor-pointer"
            >
              {[0, 1, 2, 3].map((index) => {
                const filled = index < pin.length;
                const char = filled ? (showDigits ? pin[index] : '•') : '';
                return (
                  <div
                    key={index}
                    className={`w-12 h-14 rounded-xl border flex items-center justify-center text-xl font-mono transition-all ${
                      isLocked
                        ? 'border-rose-900/60 bg-rose-950/20 text-rose-500 opacity-60'
                        : isSuccess
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : error
                        ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                        : filled
                        ? 'border-amber-400/80 bg-amber-400/5 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                        : 'border-slate-800 bg-slate-950/60 text-slate-500'
                    }`}
                  >
                    {char}
                  </div>
                );
              })}
            </div>

            {/* Toggle show/hide mask */}
            {pin.length > 0 && !isLocked && !isSuccess && (
              <button
                type="button"
                onClick={() => setShowDigits((prev) => !prev)}
                className="mt-2.5 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {showDigits ? (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>Mask Code</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>View Code</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error / Status message */}
          {error && !isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5 text-xs text-rose-400 mb-4 font-medium text-center"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Lockout Banner */}
          {isLocked && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center mb-4 space-y-1">
              <div className="font-bold flex items-center justify-center gap-1.5 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <span>Security Lockout Active</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Cooldown remaining: <span className="font-bold text-amber-400">{lockoutRemaining}s</span>
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 mb-4 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Passcode Verified! Access Granted.</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isVerifying || isSuccess || isLocked}
                onClick={() => handleDigitPress(digit)}
                className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold font-mono text-slate-200 transition-colors border border-slate-750 focus:outline-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={isVerifying || isSuccess || isLocked}
              onClick={() => {
                setPin('');
                setError(null);
              }}
              className="h-11 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 disabled:opacity-40 text-xs font-medium text-slate-400 transition-colors border border-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isVerifying || isSuccess || isLocked}
              onClick={() => handleDigitPress('0')}
              className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 text-sm font-semibold font-mono text-slate-200 transition-colors border border-slate-750"
            >
              0
            </button>
            <button
              type="button"
              disabled={isVerifying || isSuccess || isLocked}
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 disabled:opacity-40 text-xs font-medium text-slate-400 transition-colors border border-slate-800"
            >
              ⌫
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500 mt-4 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Encrypted Owner Access Only</span>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
