import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  Lock,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  Academy,
  BiologicalSex,
  StudentProfile,
  UserRole,
  UserSession,
  calculateAgeFromBirthDate,
  formatCpfMask,
  formatPhoneMask,
  normalizeAcademyCode,
  normalizeCpf,
} from '../types/workout';
import {
  deleteAcademyByCode,
  fetchAcademyByCode,
  fetchStudentProfileByCpf,
  saveAcademy,
  saveStudentProfile,
  updateAcademyPassword,
} from '../utils/fittrackStore';
import { compressLogoFile } from '../utils/imageCompression';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
}

type AuthSubMode = 'login' | 'register';
type ProfSubMode = 'login' | 'register' | 'recover';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [role, setRole] = useState<UserRole>('student');
  const [studentMode, setStudentMode] = useState<AuthSubMode>('login');
  const [profMode, setProfMode] = useState<ProfSubMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Student Login fields
  const [studentLoginCpf, setStudentLoginCpf] = useState('');
  const [studentLoginPassword, setStudentLoginPassword] = useState('');
  const [showStudentLoginPass, setShowStudentLoginPass] = useState(false);

  // Student Register fields (Basic Personal Data Only)
  const [studentAcademyCode, setStudentAcademyCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentCpfInput, setStudentCpfInput] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentRegPass, setShowStudentRegPass] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>('Masculino');
  const [phone, setPhone] = useState('');

  // Professor Login fields
  const [profLoginCode, setProfLoginCode] = useState('');
  const [profLoginPassword, setProfLoginPassword] = useState('');

  // Professor / Academy Registration fields
  const [academyNameInput, setAcademyNameInput] = useState('');
  const [academyCodeInput, setAcademyCodeInput] = useState('');
  const [profNameInput, setProfNameInput] = useState('');
  const [profCpfInput, setProfCpfInput] = useState('');
  const [profRegisterPassword, setProfRegisterPassword] = useState('');
  const [academyLogoInput, setAcademyLogoInput] = useState<string | undefined>(undefined);

  // Professor Recover / Delete Academy fields
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverProfName, setRecoverProfName] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');

  const [isGymLockedFromQr, setIsGymLockedFromQr] = useState(false);
  const [qrLinkedAcademyName, setQrLinkedAcademyName] = useState<string | null>(
    null
  );
  const [qrLinkedAcademyLogo, setQrLinkedAcademyLogo] = useState<string | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawGym = params.get('gym');
    const cleanGym = rawGym ? normalizeAcademyCode(rawGym) : '';

    if (cleanGym) {
      setRole('student');
      setStudentMode('register');
      setStudentAcademyCode(cleanGym);
      setIsGymLockedFromQr(true);

      let active = true;
      void fetchAcademyByCode(cleanGym).then((academy) => {
        if (!active) return;
        if (academy) {
          setQrLinkedAcademyName(academy.name);
          setQrLinkedAcademyLogo(academy.logoUrl ?? null);
          setErrorMsg('');
        } else {
          setQrLinkedAcademyName(null);
          setQrLinkedAcademyLogo(null);
          setErrorMsg(
            `Código "${cleanGym}" do QR Code não encontrado. Confira com a recepção da academia.`
          );
        }
      });

      return () => {
        active = false;
      };
    }
  }, []);

  const calculatedAge = useMemo(
    () => calculateAgeFromBirthDate(birthDate),
    [birthDate]
  );

  const handleRoleSwitch = (nextRole: UserRole) => {
    setRole(nextRole);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const normalizeNameCompare = (raw: string) =>
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const handleResetAcademyPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = normalizeAcademyCode(recoverCode);
    const cleanProf = normalizeNameCompare(recoverProfName);

    if (!cleanCode) {
      setErrorMsg('Informe o código da academia.');
      return;
    }
    if (!cleanProf) {
      setErrorMsg('Informe o nome do professor responsável cadastrado.');
      return;
    }
    if (recoverNewPassword.length < 4) {
      setErrorMsg('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const academy = await fetchAcademyByCode(cleanCode);
      if (!academy) {
        setErrorMsg(`Nenhuma academia encontrada com o código "${cleanCode}".`);
        return;
      }
      if (normalizeNameCompare(academy.professorName) !== cleanProf) {
        setErrorMsg('O nome do professor não confere com o cadastro desta academia.');
        return;
      }

      await updateAcademyPassword(academy, recoverNewPassword);
      setProfLoginCode(academy.code);
      setProfLoginPassword('');
      setProfMode('login');
      setSuccessMsg(
        `Senha da academia "${academy.name}" (${academy.code}) redefinida com sucesso.`
      );
      setRecoverNewPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAcademy = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = normalizeAcademyCode(recoverCode);
    const cleanProf = normalizeNameCompare(recoverProfName);

    if (!cleanCode) {
      setErrorMsg('Informe o código da academia que deseja excluir.');
      return;
    }
    if (!cleanProf) {
      setErrorMsg('Informe o nome do professor responsável para confirmar a exclusão.');
      return;
    }

    setIsLoading(true);
    try {
      const academy = await fetchAcademyByCode(cleanCode);
      if (!academy) {
        setErrorMsg(`Nenhuma academia encontrada com o código "${cleanCode}".`);
        return;
      }
      if (normalizeNameCompare(academy.professorName) !== cleanProf) {
        setErrorMsg('O nome do professor não confere com o cadastro desta academia.');
        return;
      }

      await deleteAcademyByCode(cleanCode);
      setRecoverCode('');
      setRecoverProfName('');
      setRecoverNewPassword('');
      setProfMode('register');
      setSuccessMsg(
        `Academia "${academy.name}" (${academy.code}) excluída com sucesso.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cpfDigits = normalizeCpf(studentLoginCpf);
    if (cpfDigits.length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await fetchStudentProfileByCpf(cpfDigits);
      if (!profile) {
        setErrorMsg(
          'CPF não cadastrado. Selecione "Criar Conta" acima para realizar seu cadastro.'
        );
        return;
      }
      if (profile.role === 'prof') {
        setErrorMsg(
          'Este CPF está cadastrado como Professor. Use a aba "Sou Professor" para acessar o painel.'
        );
        return;
      }

      if (profile.password) {
        if (!studentLoginPassword) {
          setErrorMsg('Informe sua senha de acesso.');
          return;
        }
        if (profile.password !== studentLoginPassword) {
          setErrorMsg('Senha incorreta para este CPF.');
          return;
        }
      }

      const targetGymCode = profile.gymCode || profile.academyCode;
      const linkedAcademy = targetGymCode
        ? await fetchAcademyByCode(targetGymCode)
        : null;

      onLogin({
        role: 'student',
        name: profile.name,
        identifier: formatCpfMask(cpfDigits),
        cpf: cpfDigits,
        academyCode: targetGymCode,
        academyName: linkedAcademy?.name ?? profile.academyName,
        academyLogo: linkedAcademy?.logoUrl,
        loggedInAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanAcademyCode = normalizeAcademyCode(studentAcademyCode);
    const cleanName = studentName.trim();
    const cpfDigits = normalizeCpf(studentCpfInput);
    const cleanEmail = studentEmail.trim().toLowerCase();
    const age = calculateAgeFromBirthDate(birthDate);

    if (!cleanAcademyCode) {
      setErrorMsg('Informe o Código da Academia ou do Personal fornecido pelo seu professor.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Informe seu nome completo.');
      return;
    }
    if (cpfDigits.length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (studentPassword.length < 4) {
      setErrorMsg('Crie uma senha com pelo menos 4 caracteres.');
      return;
    }
    if (!birthDate || age === null) {
      setErrorMsg('Informe uma data de nascimento válida.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Informe um número de WhatsApp válido com DDD.');
      return;
    }

    setIsLoading(true);
    try {
      const academy = await fetchAcademyByCode(cleanAcademyCode);
      if (!academy) {
        setErrorMsg(
          `Código "${cleanAcademyCode}" não encontrado. Confira com seu professor ou cadastre a academia na aba "Sou Professor".`
        );
        return;
      }

      const existing = await fetchStudentProfileByCpf(cpfDigits);
      if (existing && existing.password) {
        setErrorMsg(
          'Este CPF já possui uma conta cadastrada. Use a aba "Entrar" com seu CPF e senha.'
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const profile: StudentProfile = {
        cpf: cpfDigits,
        formattedCpf: formatCpfMask(cpfDigits),
        gymCode: academy.gymCode,
        academyCode: academy.code,
        academyName: academy.name,
        role: 'student',
        name: cleanName,
        email: cleanEmail,
        password: studentPassword,
        birthDate,
        age,
        phone: formatPhoneMask(phone),
        biologicalSex,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const savedRes = await saveStudentProfile(profile);
      if (!savedRes.syncedToCloud) {
        setErrorMsg(
          'Não foi possível salvar seu cadastro no Firebase. Verifique sua conexão e tente novamente.'
        );
        return;
      }

      onLogin({
        role: 'student',
        name: cleanName,
        identifier: profile.formattedCpf,
        cpf: cpfDigits,
        academyCode: academy.gymCode,
        academyName: academy.name,
        academyLogo: academy.logoUrl,
        loggedInAt: nowIso,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessorLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = normalizeAcademyCode(profLoginCode);
    if (!cleanCode) {
      setErrorMsg('Informe o código da academia ou personal.');
      return;
    }
    if (!profLoginPassword) {
      setErrorMsg('Informe a senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const academy = await fetchAcademyByCode(cleanCode);
      if (!academy) {
        setErrorMsg(
          'Nenhuma academia ou personal encontrado com este código. Use "Cadastrar Academia" para criar o seu.'
        );
        return;
      }
      if (academy.password !== profLoginPassword) {
        setErrorMsg('Senha incorreta para esta academia.');
        return;
      }

      onLogin({
        role: 'professor',
        name: academy.professorName,
        identifier: academy.gymCode,
        cpf: academy.professorCpf,
        academyCode: academy.gymCode,
        academyName: academy.name,
        academyLogo: academy.logoUrl,
        loggedInAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessorRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanAcademyName = academyNameInput.trim();
    const cleanCode = normalizeAcademyCode(academyCodeInput);
    const cleanProfName = profNameInput.trim();
    const profCpfDigits = normalizeCpf(profCpfInput);

    if (!cleanAcademyName) {
      setErrorMsg('Informe o nome da Academia ou Personal Trainer.');
      return;
    }
    if (cleanCode.length < 3) {
      setErrorMsg('Defina um código de convite com pelo menos 3 caracteres.');
      return;
    }
    if (!cleanProfName) {
      setErrorMsg('Informe o nome do professor responsável.');
      return;
    }
    if (profCpfDigits.length !== 11) {
      setErrorMsg('Informe um CPF válido (11 dígitos) para o professor responsável.');
      return;
    }
    if (profRegisterPassword.length < 4) {
      setErrorMsg('Defina uma senha com pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const existing = await fetchAcademyByCode(cleanCode);
      if (existing) {
        setErrorMsg(`O código "${cleanCode}" já está em uso. Escolha outro código único.`);
        return;
      }

      const nowIso = new Date().toISOString();
      const newAcademy: Academy = {
        code: cleanCode,
        gymCode: cleanCode,
        name: cleanAcademyName,
        professorName: cleanProfName,
        professorCpf: profCpfDigits,
        password: profRegisterPassword,
        logoUrl: academyLogoInput,
        createdAt: nowIso,
      };

      const gymRes = await saveAcademy(newAcademy);
      if (!gymRes.syncedToCloud) {
        setErrorMsg(
          'Não foi possível criar a academia no Firebase. Verifique sua conexão e tente novamente.'
        );
        return;
      }

      await saveStudentProfile({
        cpf: profCpfDigits,
        formattedCpf: formatCpfMask(profCpfDigits),
        gymCode: cleanCode,
        academyCode: cleanCode,
        academyName: cleanAcademyName,
        role: 'prof',
        name: cleanProfName,
        password: profRegisterPassword,
        birthDate: '',
        age: 0,
        phone: '',
        biologicalSex: 'Masculino',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      onLogin({
        role: 'professor',
        name: newAcademy.professorName,
        identifier: newAcademy.gymCode,
        cpf: profCpfDigits,
        academyCode: newAcademy.gymCode,
        academyName: newAcademy.name,
        academyLogo: newAcademy.logoUrl,
        loggedInAt: nowIso,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12)_0%,transparent_55%)]"
      />

      <div
        className={`relative w-full ${
          role === 'student' && studentMode === 'register' ? 'max-w-lg' : 'max-w-md'
        } bg-[#14161a] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/60 transition-[max-width] duration-200`}
      >
        {/* Top Brand Logo (displays Academy logo dynamically when linked via QR Code) */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className={`w-20 h-20 rounded-2xl bg-white p-1.5 shadow-lg mb-3 ${
              qrLinkedAcademyLogo
                ? 'ring-2 ring-emerald-500'
                : 'ring-2 ring-orange-500/40'
            }`}
          >
            <img
              src={qrLinkedAcademyLogo ?? '/pwa-512x512.png'}
              alt={qrLinkedAcademyName ?? 'FitTrack Academia'}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-100">
            {qrLinkedAcademyName ? (
              <span className="text-emerald-400">{qrLinkedAcademyName}</span>
            ) : (
              <>
                Fit<span className="text-orange-500">Track</span>{' '}
                <span className="text-zinc-300 font-semibold">Academia</span>
              </>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {qrLinkedAcademyName
              ? 'FitTrack Academia · Pré-cadastro do aluno'
              : 'Plataforma multi-academias e personal trainers'}
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div
          role="tablist"
          aria-label="Tipo de acesso"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0b0c0e] border border-zinc-800 mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === 'student'}
            onClick={() => handleRoleSwitch('student')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              role === 'student'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <User className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sou Aluno</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={role === 'professor'}
            onClick={() => handleRoleSwitch('professor')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              role === 'professor'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sou Professor</span>
          </button>
        </div>

        {qrLinkedAcademyName && role === 'student' && studentMode === 'register' && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/50 rounded-xl px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              ✅ Vinculado automaticamente à academia:{' '}
              <strong className="text-emerald-200">{qrLinkedAcademyName}</strong>
            </span>
          </div>
        )}

        {errorMsg && (
          <p
            role="alert"
            className="mb-4 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5"
          >
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p
            role="status"
            className="mb-4 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5"
          >
            {successMsg}
          </p>
        )}

        {role === 'student' ? (
          <div className="space-y-4">
            {/* Student Login vs Create Account */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0b0c0e] border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setStudentMode('login');
                  setErrorMsg('');
                }}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  studentMode === 'login'
                    ? 'bg-orange-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentMode('register');
                  setErrorMsg('');
                }}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  studentMode === 'register'
                    ? 'bg-orange-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {studentMode === 'login' ? (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-student-cpf"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    CPF do aluno
                  </label>
                  <input
                    id="login-student-cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={studentLoginCpf}
                    onChange={(e) => setStudentLoginCpf(formatCpfMask(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-student-pass"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-student-pass"
                      type={showStudentLoginPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={studentLoginPassword}
                      onChange={(e) => setStudentLoginPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentLoginPass((v) => !v)}
                      aria-label={showStudentLoginPass ? 'Ocultar senha' : 'Mostrar senha'}
                      className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      {showStudentLoginPass ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] mt-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 active:scale-[0.99] text-zinc-950 text-sm font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {isLoading ? 'Entrando...' : 'Entrar no meu treino'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleStudentRegister} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="reg-academy-code"
                      className="block text-xs font-medium text-zinc-300"
                    >
                      Código da Academia / Personal
                    </label>
                    {isGymLockedFromQr && (
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Travado via QR Code
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="reg-academy-code"
                      type="text"
                      required
                      readOnly={isGymLockedFromQr}
                      placeholder="Solicite o código ao seu professor"
                      value={studentAcademyCode}
                      onChange={(e) => {
                        if (isGymLockedFromQr) return;
                        setStudentAcademyCode(normalizeAcademyCode(e.target.value));
                      }}
                      className={`w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl border text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none ${
                        isGymLockedFromQr
                          ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-200 cursor-not-allowed'
                          : 'bg-[#0b0c0e] border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500'
                      }`}
                    />
                    <Building2
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isGymLockedFromQr ? 'text-emerald-400' : 'text-purple-400'
                      }`}
                      aria-hidden="true"
                    />
                    {isGymLockedFromQr && (
                      <Lock
                        className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-student-name"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      Nome completo
                    </label>
                    <input
                      id="reg-student-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Ex: Lucas Oliveira"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-student-cpf"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      CPF
                    </label>
                    <input
                      id="reg-student-cpf"
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="000.000.000-00"
                      value={studentCpfInput}
                      onChange={(e) =>
                        setStudentCpfInput(formatCpfMask(e.target.value))
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-student-email"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      E-mail
                    </label>
                    <input
                      id="reg-student-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-student-pass"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        id="reg-student-pass"
                        type={showStudentRegPass ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Mínimo 4 caracteres"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        className="w-full min-h-[44px] pl-3.5 pr-11 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentRegPass((v) => !v)}
                        aria-label={showStudentRegPass ? 'Ocultar senha' : 'Mostrar senha'}
                        className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
                      >
                        {showStudentRegPass ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="reg-birthdate"
                        className="block text-xs font-medium text-zinc-300"
                      >
                        Data de nascimento
                      </label>
                      {calculatedAge !== null && (
                        <span className="text-xs font-mono tabular-nums font-semibold text-orange-400">
                          {calculatedAge} anos
                        </span>
                      )}
                    </div>
                    <input
                      id="reg-birthdate"
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      WhatsApp
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-zinc-300 mb-1">
                    Sexo biológico
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Masculino', 'Feminino'] as BiologicalSex[]).map((sex) => (
                      <button
                        key={sex}
                        type="button"
                        onClick={() => setBiologicalSex(sex)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          biologicalSex === sex
                            ? 'bg-orange-500 border-orange-500 text-zinc-950 font-bold'
                            : 'bg-[#0b0c0e] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {sex}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                  A anamnese e avaliação física completa serão preenchidas presencialmente pelo seu professor.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 active:scale-[0.99] text-zinc-950 text-sm font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {isLoading ? 'Salvando cadastro...' : 'Criar conta e aguardar professor'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Professor Login vs Register Academy / Personal */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0b0c0e] border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setProfMode('login');
                  setErrorMsg('');
                }}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  profMode === 'login'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Entrar no Painel
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfMode('register');
                  setErrorMsg('');
                }}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  profMode === 'register'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cadastrar Academia
              </button>
            </div>

            {profMode === 'login' ? (
              <form onSubmit={handleProfessorLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-prof-code"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Código da Academia ou Personal
                  </label>
                  <input
                    id="login-prof-code"
                    type="text"
                    placeholder="Ex: STUDIO-FIT"
                    value={profLoginCode}
                    onChange={(e) =>
                      setProfLoginCode(normalizeAcademyCode(e.target.value))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono uppercase text-zinc-100 placeholder:text-zinc-500 placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-prof-pass"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-prof-pass"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={profLoginPassword}
                      onChange={(e) => setProfLoginPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                    <Lock
                      className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 active:scale-[0.99] text-white text-sm font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  {isLoading ? 'Acessando...' : 'Acessar Modo Professor'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfMode('recover');
                    setRecoverCode(profLoginCode);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full min-h-[40px] text-xs font-medium text-zinc-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Esqueci a senha ou quero excluir uma academia
                </button>
              </form>
            ) : profMode === 'recover' ? (
              <form onSubmit={handleResetAcademyPassword} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-purple-300">
                    Recuperar senha ou excluir academia
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfMode('login');
                      setErrorMsg('');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="rec-acad-code"
                    className="block text-xs font-medium text-zinc-300 mb-1"
                  >
                    Código da Academia / Personal
                  </label>
                  <input
                    id="rec-acad-code"
                    type="text"
                    placeholder="Ex: MAIS-VIDA"
                    value={recoverCode}
                    onChange={(e) =>
                      setRecoverCode(normalizeAcademyCode(e.target.value))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono uppercase text-zinc-100 placeholder:text-zinc-500 placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rec-prof-name"
                    className="block text-xs font-medium text-zinc-300 mb-1"
                  >
                    Nome do professor responsável
                  </label>
                  <input
                    id="rec-prof-name"
                    type="text"
                    placeholder="Exatamente como cadastrado"
                    value={recoverProfName}
                    onChange={(e) => setRecoverProfName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rec-new-pass"
                    className="block text-xs font-medium text-zinc-300 mb-1"
                  >
                    Nova senha (para redefinir acesso)
                  </label>
                  <input
                    id="rec-new-pass"
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={recoverNewPassword}
                    onChange={(e) => setRecoverNewPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                  >
                    {isLoading ? 'Salvando...' : 'Redefinir senha'}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleDeleteAcademy()}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 disabled:opacity-60 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Excluir academia</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleProfessorRegister} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="reg-acad-name"
                    className="block text-xs font-medium text-zinc-300 mb-1"
                  >
                    Nome da Academia ou Personal
                  </label>
                  <input
                    id="reg-acad-name"
                    type="text"
                    placeholder="Ex: Academia Iron Fit"
                    value={academyNameInput}
                    onChange={(e) => setAcademyNameInput(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-acad-code"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      Código de convite
                    </label>
                    <input
                      id="reg-acad-code"
                      type="text"
                      placeholder="Ex: IRON-FIT"
                      value={academyCodeInput}
                      onChange={(e) =>
                        setAcademyCodeInput(normalizeAcademyCode(e.target.value))
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono uppercase text-zinc-100 placeholder:text-zinc-500 placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-prof-name"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      Professor responsável
                    </label>
                    <input
                      id="reg-prof-name"
                      type="text"
                      placeholder="Ex: Prof. Marcos"
                      value={profNameInput}
                      onChange={(e) => setProfNameInput(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-prof-cpf"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      CPF do professor
                    </label>
                    <input
                      id="reg-prof-cpf"
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="000.000.000-00"
                      value={profCpfInput}
                      onChange={(e) => setProfCpfInput(formatCpfMask(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-prof-pass"
                      className="block text-xs font-medium text-zinc-300 mb-1"
                    >
                      Senha de acesso do professor
                    </label>
                    <input
                      id="reg-prof-pass"
                      type="password"
                      placeholder="Mínimo 4 caracteres"
                      value={profRegisterPassword}
                      onChange={(e) => setProfRegisterPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Logo da Academia (opcional)
                  </span>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-800">
                    <div className="w-12 h-12 rounded-xl bg-white p-1 border border-zinc-700 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={academyLogoInput ?? '/pwa-512x512.png'}
                        alt="Prévia da logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-xs font-semibold text-purple-200 cursor-pointer transition-colors">
                        <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{academyLogoInput ? 'Trocar logo' : 'Enviar logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            try {
                              const compressed = await compressLogoFile(file);
                              setAcademyLogoInput(compressed);
                            } catch {
                              setErrorMsg('Não foi possível processar a imagem da logo.');
                            }
                          }}
                        />
                      </label>
                      <p className="text-[11px] text-zinc-500 mt-1 truncate">
                        Aparecerá no cabeçalho e nos QR Codes da academia
                      </p>
                    </div>
                    {academyLogoInput && (
                      <button
                        type="button"
                        onClick={() => setAcademyLogoInput(undefined)}
                        aria-label="Remover logo"
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] mt-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 active:scale-[0.99] text-white text-sm font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  {isLoading
                    ? 'Criando ambiente...'
                    : 'Criar Academia / Personal e Entrar'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
