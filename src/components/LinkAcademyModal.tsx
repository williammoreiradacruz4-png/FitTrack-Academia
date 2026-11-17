import { FormEvent, useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { Academy, StudentProfile, normalizeAcademyCode } from '../types/workout';
import { fetchAcademyByCode, saveStudentProfile } from '../utils/fittrackStore';

interface LinkAcademyModalProps {
  isOpen: boolean;
  currentCode?: string;
  studentProfile: StudentProfile | null;
  onClose: () => void;
  onLinked: (academy: Academy, updatedProfile: StudentProfile | null) => void;
}

export function LinkAcademyModal({
  isOpen,
  currentCode,
  studentProfile,
  onClose,
  onLinked,
}: LinkAcademyModalProps) {
  const [codeInput, setCodeInput] = useState(currentCode ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCodeInput(currentCode ?? '');
    setErrorMsg('');
    setIsSaving(false);
  }, [isOpen, currentCode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = normalizeAcademyCode(codeInput);
    if (!cleanCode) {
      setErrorMsg('Informe o código da academia ou do personal.');
      return;
    }

    setIsSaving(true);
    try {
      const academy = await fetchAcademyByCode(cleanCode);
      if (!academy) {
        setErrorMsg(`Nenhuma academia ou personal encontrado com o código "${cleanCode}".`);
        return;
      }

      let updatedProfile: StudentProfile | null = null;
      if (studentProfile) {
        updatedProfile = {
          ...studentProfile,
          academyCode: academy.code,
          academyName: academy.name,
          updatedAt: new Date().toISOString(),
        };
        await saveStudentProfile(updatedProfile);
      }

      onLinked(academy, updatedProfile);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-academy-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" aria-hidden="true" />
            <h2 id="link-academy-title" className="font-display text-xl font-bold text-zinc-50">
              Vincular Academia / Personal
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <p className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}

          <div>
            <label
              htmlFor="switch-academy-code"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Código da Academia ou Personal
            </label>
            <input
              id="switch-academy-code"
              type="text"
              autoFocus
              placeholder="Digite o código fornecido pelo professor"
              value={codeInput}
              onChange={(e) => setCodeInput(normalizeAcademyCode(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono uppercase text-zinc-100 placeholder:text-zinc-500 placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
            >
              {isSaving ? 'Vinculando...' : 'Confirmar vínculo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
