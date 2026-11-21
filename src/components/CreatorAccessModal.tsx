import { FormEvent, useEffect, useState } from 'react';
import { Lock, Sparkles, X } from 'lucide-react';
import {
  Academy,
  GALLERY_GYM_CODE,
  UserSession,
  formatCpfMask,
  normalizeCpf,
} from '../types/workout';
import {
  fetchAcademyByCode,
  saveAcademy,
  saveStudentProfile,
  updateAcademyPassword,
} from '../utils/fittrackStore';

interface CreatorAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (creatorSession: UserSession) => void;
}

function normalizeNameCompare(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function CreatorAccessModal({
  isOpen,
  onClose,
  onAuthenticated,
}: CreatorAccessModalProps) {
  const [creatorAccount, setCreatorAccount] = useState<Academy | null>(null);
  const [checking, setChecking] = useState(false);
  const [recoverMode, setRecoverMode] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRecoverMode(false);
    setPasswordInput('');
    setNewPasswordInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setChecking(true);

    let active = true;
    void fetchAcademyByCode(GALLERY_GYM_CODE)
      .then((acc) => {
        if (!active) return;
        setCreatorAccount(acc);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!creatorAccount) {
      const cleanName = nameInput.trim();
      const cpfDigits = normalizeCpf(cpfInput);
      if (!cleanName) {
        setErrorMsg('Informe o nome do criador do aplicativo.');
        return;
      }
      if (cpfDigits.length !== 11) {
        setErrorMsg('Informe um CPF válido (11 dígitos).');
        return;
      }
      if (passwordInput.length < 4) {
        setErrorMsg('Defina uma senha mestra com pelo menos 4 caracteres.');
        return;
      }

      setIsSubmitting(true);
      try {
        const nowIso = new Date().toISOString();
        const masterAcademy: Academy = {
          code: GALLERY_GYM_CODE,
          gymCode: GALLERY_GYM_CODE,
          name: 'Galeria Oficial FitTrack',
          professorName: cleanName,
          professorCpf: cpfDigits,
          password: passwordInput,
          createdAt: nowIso,
        };
        const res = await saveAcademy(masterAcademy);
        if (!res.syncedToCloud) {
          setErrorMsg('Não foi possível salvar o acesso no Firebase. Verifique sua conexão.');
          return;
        }
        await saveStudentProfile({
          cpf: cpfDigits,
          formattedCpf: formatCpfMask(cpfDigits),
          gymCode: GALLERY_GYM_CODE,
          academyCode: GALLERY_GYM_CODE,
          academyName: 'Galeria Oficial FitTrack',
          role: 'prof',
          name: cleanName,
          password: passwordInput,
          birthDate: '',
          age: 0,
          phone: '',
          biologicalSex: 'Masculino',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        onAuthenticated({
          role: 'professor',
          name: cleanName,
          identifier: GALLERY_GYM_CODE,
          cpf: cpfDigits,
          academyCode: GALLERY_GYM_CODE,
          academyName: 'Galeria Oficial FitTrack',
          isCreator: true,
          loggedInAt: nowIso,
        });
        onClose();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (recoverMode) {
      const cleanName = normalizeNameCompare(nameInput);
      const cpfDigits = normalizeCpf(cpfInput);
      if (normalizeNameCompare(creatorAccount.professorName) !== cleanName) {
        setErrorMsg('O nome informado não confere com o cadastro do criador.');
        return;
      }
      if (creatorAccount.professorCpf && creatorAccount.professorCpf !== cpfDigits) {
        setErrorMsg('O CPF informado não confere com o cadastro do criador.');
        return;
      }
      if (newPasswordInput.length < 4) {
        setErrorMsg('A nova senha deve ter pelo menos 4 caracteres.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await updateAcademyPassword(creatorAccount, newPasswordInput);
        if (!res.syncedToCloud) {
          setErrorMsg('Não foi possível redefinir a senha no Firebase.');
          return;
        }
        setCreatorAccount({ ...creatorAccount, password: newPasswordInput });
        setRecoverMode(false);
        setNewPasswordInput('');
        setPasswordInput('');
        setSuccessMsg('Senha do Criador redefinida com sucesso.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!passwordInput) {
      setErrorMsg('Informe a senha mestra do criador.');
      return;
    }
    if (creatorAccount.password !== passwordInput) {
      setErrorMsg('Senha incorreta para o acesso do criador.');
      return;
    }

    onAuthenticated({
      role: 'professor',
      name: creatorAccount.professorName,
      identifier: GALLERY_GYM_CODE,
      cpf: creatorAccount.professorCpf,
      academyCode: GALLERY_GYM_CODE,
      academyName: creatorAccount.name,
      academyLogo: creatorAccount.logoUrl,
      isCreator: true,
      loggedInAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-access-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Galeria Oficial FitTrack</span>
            </div>
            <h2 id="creator-access-title" className="font-display text-xl font-bold text-zinc-50 mt-0.5">
              {checking
                ? 'Verificando acesso...'
                : !creatorAccount
                  ? 'Ativar Modo Criador'
                  : recoverMode
                    ? 'Redefinir senha do Criador'
                    : 'Entrar no Modo Criador'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {errorMsg && (
          <p role="alert" className="mb-3 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p role="status" className="mb-3 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5">
            {successMsg}
          </p>
        )}

        {checking ? (
          <p className="text-xs text-zinc-400 py-6 text-center">
            Consultando Galeria Oficial no Firebase...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!creatorAccount ? (
              <>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Configure seu acesso mestre de criador para fazer upload de imagens do PC e cadastrar todos os exercícios da Galeria Global.
                </p>
                <div>
                  <label htmlFor="modal-creator-name" className="block text-xs font-medium text-zinc-300 mb-1">
                    Nome do Criador
                  </label>
                  <input
                    id="modal-creator-name"
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="modal-creator-cpf" className="block text-xs font-medium text-zinc-300 mb-1">
                    CPF (para recuperação de senha)
                  </label>
                  <input
                    id="modal-creator-cpf"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="000.000.000-00"
                    value={cpfInput}
                    onChange={(e) => setCpfInput(formatCpfMask(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="modal-creator-pass" className="block text-xs font-medium text-zinc-300 mb-1">
                    Senha mestra
                  </label>
                  <input
                    id="modal-creator-pass"
                    type="password"
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-sm font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Ativando...' : 'Ativar Modo Criador e Upload'}
                </button>
              </>
            ) : recoverMode ? (
              <>
                <div>
                  <label htmlFor="modal-rec-name" className="block text-xs font-medium text-zinc-300 mb-1">
                    Nome cadastrado
                  </label>
                  <input
                    id="modal-rec-name"
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="modal-rec-cpf" className="block text-xs font-medium text-zinc-300 mb-1">
                    CPF cadastrado
                  </label>
                  <input
                    id="modal-rec-cpf"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="000.000.000-00"
                    value={cpfInput}
                    onChange={(e) => setCpfInput(formatCpfMask(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="modal-rec-pass" className="block text-xs font-medium text-zinc-300 mb-1">
                    Nova senha mestra
                  </label>
                  <input
                    id="modal-rec-pass"
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverMode(false);
                      setErrorMsg('');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-[#0b0c0e] border border-zinc-800 px-3.5 py-2.5 text-xs">
                  <span className="text-zinc-400">Criador: </span>
                  <strong className="text-zinc-100">{creatorAccount.professorName}</strong>
                </div>
                <div>
                  <label htmlFor="modal-creator-login-pass" className="block text-xs font-medium text-zinc-300 mb-1">
                    Senha mestra do Criador
                  </label>
                  <div className="relative">
                    <input
                      id="modal-creator-login-pass"
                      type="password"
                      required
                      autoFocus
                      placeholder="Digite sua senha mestra"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full min-h-[44px] pl-3.5 pr-10 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-sm font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar no Modo Criador'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverMode(true);
                    setErrorMsg('');
                  }}
                  className="w-full min-h-[38px] text-xs font-medium text-zinc-400 hover:text-orange-300 cursor-pointer"
                >
                  Esqueci a senha do Criador
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
