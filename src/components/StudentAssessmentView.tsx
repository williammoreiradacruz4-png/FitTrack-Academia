import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Flame,
  HeartPulse,
  RefreshCw,
} from 'lucide-react';
import {
  PhysicalAssessment,
  calculateBMI,
  calculateNutritionAndSupplements,
  calculateWHR,
  formatDateBr,
  getReassessmentStatus,
} from '../types/workout';
import {
  fetchAssessmentsByStudentCpf,
  subscribeAssessmentsByStudentCpf,
} from '../utils/fittrackStore';
import { AssessmentEvolutionSection } from './AssessmentEvolutionSection';

interface StudentAssessmentViewProps {
  studentCpf: string;
  studentName: string;
}

const DEVIATION_LABELS: Array<{
  key: keyof NonNullable<PhysicalAssessment['postureDeviations']>;
  label: string;
}> = [
  { key: 'hyperlordosis', label: 'Hiperlordose' },
  { key: 'hyperkyphosis', label: 'Hipercifose' },
  { key: 'scoliosis', label: 'Escoliose' },
  { key: 'roundedShoulders', label: 'Ombros protusos' },
  { key: 'kneeValgusVarus', label: 'Joelhos valgos/varos' },
];

const PARQ_LABELS: Array<{
  key: keyof NonNullable<PhysicalAssessment['parq']>;
  label: string;
}> = [
  { key: 'chestPain', label: 'Dores no peito ao esforço' },
  { key: 'dizziness', label: 'Tonturas ou perda de equilíbrio' },
  { key: 'boneOrJointProblems', label: 'Problemas ósseos/articulares' },
  { key: 'bloodPressureOrHeartMeds', label: 'Uso de medicação cardíaca/pressão' },
];

export function StudentAssessmentView({
  studentCpf,
  studentName,
}: StudentAssessmentViewProps) {
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAssessmentsByStudentCpf(studentCpf);
      setAssessments(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeAssessmentsByStudentCpf(studentCpf, (list) => {
      setAssessments(list);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [studentCpf]);

  const latest = assessments[0] ?? null;

  if (!latest) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-[#14161a] border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0b0c0e] border border-zinc-800 flex items-center justify-center mx-auto text-orange-400">
            <ClipboardList className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl font-bold text-zinc-50">
            Nenhuma avaliação física registrada
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Assim que seu professor realizar e salvar sua avaliação física presencial, toda a sua ficha, cálculos nutricionais, composição corporal e gráficos comparativos aparecerão aqui.
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isLoading ? 'Verificando...' : 'Atualizar resultados'}</span>
          </button>
        </div>
      </main>
    );
  }

  const bmi = calculateBMI(latest.weightKg, latest.heightCm);
  const whr =
    latest.waistCm && latest.hipCm
      ? calculateWHR(
          latest.waistCm,
          latest.hipCm,
          latest.biologicalSex ?? 'Masculino'
        )
      : null;
  const validity = getReassessmentStatus(latest.nextReassessmentDate);

  const fallbackNutri = calculateNutritionAndSupplements(latest.weightKg);
  const nutrition = fallbackNutri
    ? {
        proteinG: latest.proteinG ?? fallbackNutri.proteinG,
        waterMl: latest.waterMl ?? fallbackNutri.waterMl,
        caloriesKcal: latest.caloriesKcal ?? fallbackNutri.caloriesKcal,
        creatineG: latest.creatineG ?? fallbackNutri.creatineG,
        caffeineMg: latest.caffeineMg ?? fallbackNutri.caffeineMg,
        omegaMg: latest.omegaMg ?? fallbackNutri.omegaMg,
      }
    : null;

  const activeDeviations = DEVIATION_LABELS.filter(
    (d) => latest.postureDeviations?.[d.key]
  ).map((d) => d.label);

  const positiveParq = PARQ_LABELS.filter(
    (p) => latest.parq?.[p.key]
  ).map((p) => p.label);

  const symmetryRows = [
    {
      label: 'Braço relaxado',
      right: latest.armRelaxedRightCm,
      left: latest.armRelaxedLeftCm,
    },
    {
      label: 'Braço contraído',
      right: latest.armContractedRightCm,
      left: latest.armContractedLeftCm,
    },
    {
      label: 'Antebraço',
      right: latest.forearmRightCm,
      left: latest.forearmLeftCm,
    },
    {
      label: 'Coxa proximal',
      right: latest.thighProxRightCm,
      left: latest.thighProxLeftCm,
    },
    {
      label: 'Coxa medial',
      right: latest.thighMedRightCm,
      left: latest.thighMedLeftCm,
    },
    {
      label: 'Panturrilha',
      right: latest.calfRightCm,
      left: latest.calfLeftCm,
    },
  ].filter((r) => r.right !== undefined || r.left !== undefined);

  const trunkItems = [
    latest.chestCm ? { label: 'Tórax', value: `${latest.chestCm} cm` } : null,
    latest.waistCm ? { label: 'Cintura', value: `${latest.waistCm} cm` } : null,
    latest.abdomenCm ? { label: 'Abdômen', value: `${latest.abdomenCm} cm` } : null,
    latest.hipCm ? { label: 'Quadril', value: `${latest.hipCm} cm` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const skinfoldItems = [
    latest.skinfoldPectoralMm ? { label: 'Peitoral', value: `${latest.skinfoldPectoralMm} mm` } : null,
    latest.skinfoldAbdominalMm ? { label: 'Abdominal', value: `${latest.skinfoldAbdominalMm} mm` } : null,
    latest.skinfoldThighMm ? { label: 'Coxa', value: `${latest.skinfoldThighMm} mm` } : null,
    latest.skinfoldTricepsMm ? { label: 'Tríceps', value: `${latest.skinfoldTricepsMm} mm` } : null,
    latest.skinfoldSuprailiacMm ? { label: 'Supra-ilíaca', value: `${latest.skinfoldSuprailiacMm} mm` } : null,
    latest.skinfoldSubscapularMm ? { label: 'Subescapular', value: `${latest.skinfoldSubscapularMm} mm` } : null,
    latest.skinfoldMidaxillaryMm ? { label: 'Axilar média', value: `${latest.skinfoldMidaxillaryMm} mm` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const physicalTestItems = [
    latest.wellsBenchCm !== undefined ? { label: 'Banco de Wells', value: `${latest.wellsBenchCm} cm` } : null,
    latest.pushups1Min !== undefined ? { label: 'Flexões (1 min)', value: `${latest.pushups1Min} rep` } : null,
    latest.situps1Min !== undefined ? { label: 'Abdominais (1 min)', value: `${latest.situps1Min} rep` } : null,
    latest.vo2Max !== undefined ? { label: 'VO2 máximo', value: `${latest.vo2Max}` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasVitals = Boolean(
    (latest.systolicBp && latest.diastolicBp) || latest.restingHr
  );

  const hasAnamnesisBlock = Boolean(
    latest.sleepHours !== undefined ||
      latest.weeklyFrequency !== undefined ||
      latest.clinicalHistory ||
      positiveParq.length > 0 ||
      latest.parq
  );

  const hasPhotos = Boolean(
    latest.posturePhotos?.front ||
      latest.posturePhotos?.back ||
      latest.posturePhotos?.profile
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header & Validity Alert */}
      <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-orange-400">
              Minha Ficha de Avaliação Física
            </p>
            <h2 className="font-display text-2xl font-bold text-zinc-50 mt-0.5">
              {studentName}
            </h2>
            <p className="text-xs font-mono tabular-nums text-zinc-400 mt-0.5">
              Última avaliação em {formatDateBr(latest.date)}
              {latest.studentAge !== undefined ? ` · ${latest.studentAge} anos` : ''}
              {latest.biologicalSex ? ` · ${latest.biologicalSex}` : ''}
              {latest.goal ? ` · Objetivo: ${latest.goal}` : ''}
              {latest.activityLevel ? ` · Nível: ${latest.activityLevel}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Validity banner */}
        {latest.nextReassessmentDate && (
          <div
            className={`rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-2 text-xs ${
              validity.status === 'overdue'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : validity.status === 'soon'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-[#0b0c0e] border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {validity.status === 'overdue' || validity.status === 'soon' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <CalendarClock className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              )}
              <span>{validity.label}</span>
            </div>
            <span className="font-mono tabular-nums text-zinc-400">
              Próxima reavaliação: {formatDateBr(latest.nextReassessmentDate)}
            </span>
          </div>
        )}

        {/* Primary Clinical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
            <p className="text-[11px] text-zinc-400">Peso / Altura</p>
            <p className="text-base font-mono tabular-nums font-bold text-zinc-100 mt-1">
              {latest.weightKg} kg · {latest.heightCm} cm
            </p>
          </div>

          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
            <p className="text-[11px] text-zinc-400">IMC</p>
            <p className="text-base font-mono tabular-nums font-bold text-orange-400 mt-1">
              {bmi ? `${bmi.value}` : '—'}
            </p>
            {bmi && <p className="text-[11px] text-zinc-400 mt-0.5">{bmi.label}</p>}
          </div>

          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
            <p className="text-[11px] text-zinc-400">Composição Corporal</p>
            <p className="text-base font-mono tabular-nums font-bold text-zinc-100 mt-1">
              {latest.bodyFatPercent !== undefined
                ? `${latest.bodyFatPercent}% GC`
                : '—'}
            </p>
            {(latest.leanMassKg !== undefined || latest.fatMassKg !== undefined) && (
              <p className="text-[11px] font-mono tabular-nums text-zinc-400 mt-0.5">
                {latest.leanMassKg !== undefined ? `Magra ${latest.leanMassKg}kg` : ''}
                {latest.leanMassKg !== undefined && latest.fatMassKg !== undefined ? ' · ' : ''}
                {latest.fatMassKg !== undefined ? `Gorda ${latest.fatMassKg}kg` : ''}
              </p>
            )}
          </div>

          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
            <p className="text-[11px] text-zinc-400">RCQ / Sinais Vitais</p>
            <p className="text-base font-mono tabular-nums font-bold text-zinc-100 mt-1">
              {whr ? `RCQ ${whr.value}` : latest.systolicBp && latest.diastolicBp ? `PA ${latest.systolicBp}/${latest.diastolicBp}` : '—'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {whr
                ? whr.riskLabel
                : latest.restingHr
                  ? `FC repouso ${latest.restingHr} bpm`
                  : 'Dados gerais'}
            </p>
          </div>
        </div>

        {/* Dedicated Vital Signs row when present */}
        {hasVitals && (
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums text-zinc-300">
            <span className="font-sans font-semibold text-orange-400 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" aria-hidden="true" />
              Sinais Vitais:
            </span>
            {latest.systolicBp && latest.diastolicBp && (
              <span>
                Pressão Arterial {latest.systolicBp}/{latest.diastolicBp} mmHg
              </span>
            )}
            {latest.restingHr && (
              <span>FC Repouso {latest.restingHr} bpm</span>
            )}
          </div>
        )}

        {/* Bioimpedance Extras if applicable */}
        {latest.compositionMethod === 'bioimpedancia' &&
          (latest.skeletalMuscleMassKg !== undefined ||
            latest.visceralFatLevel !== undefined ||
            latest.bmrKcal !== undefined ||
            latest.bodyWaterPercent !== undefined) && (
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums text-zinc-300">
              <span className="font-sans font-semibold text-orange-400">
                Bioimpedância:
              </span>
              {latest.skeletalMuscleMassKg !== undefined && (
                <span>Massa muscular {latest.skeletalMuscleMassKg} kg</span>
              )}
              {latest.visceralFatLevel !== undefined && (
                <span>Gordura visceral {latest.visceralFatLevel}</span>
              )}
              {latest.bmrKcal !== undefined && (
                <span>TMB {latest.bmrKcal} kcal</span>
              )}
              {latest.bodyWaterPercent !== undefined && (
                <span>Água {latest.bodyWaterPercent}%</span>
              )}
            </div>
          )}

        {/* Skinfold measurements if present */}
        {skinfoldItems.length > 0 && (
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums text-zinc-300">
            <span className="font-sans font-semibold text-orange-400">
              Dobras Cutâneas ({latest.compositionMethod === 'pollock7' ? 'Pollock 7' : 'Pollock 3'}):
            </span>
            {skinfoldItems.map((s) => (
              <span key={s.label}>
                {s.label} {s.value}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Nutrição & Suplementação Automática pelo Peso */}
      {nutrition && (
        <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-zinc-50">
                Meta Nutricional & Suplementação Diária
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-zinc-400">
              Calculado pelo peso ({latest.weightKg} kg)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <p className="text-[11px] text-zinc-400">Proteína Diária</p>
              <p className="text-lg font-mono tabular-nums font-bold text-zinc-100 mt-1">
                {nutrition.proteinG} g
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Peso × 2
              </p>
            </div>

            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] text-zinc-400">Água Diária</p>
                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-lg font-mono tabular-nums font-bold text-sky-400 mt-1">
                {nutrition.waterMl} ml
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                {(nutrition.waterMl / 1000).toFixed(2)} L · Peso × 35
              </p>
            </div>

            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <p className="text-[11px] text-zinc-400">Calorias Diárias</p>
              <p className="text-lg font-mono tabular-nums font-bold text-orange-400 mt-1">
                {nutrition.caloriesKcal} kcal
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Peso × 25
              </p>
            </div>

            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <p className="text-[11px] text-zinc-400">Creatina</p>
              <p className="text-lg font-mono tabular-nums font-bold text-zinc-100 mt-1">
                {nutrition.creatineG} g
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Peso × 0,03
              </p>
            </div>

            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <p className="text-[11px] text-zinc-400">Cafeína</p>
              <p className="text-lg font-mono tabular-nums font-bold text-zinc-100 mt-1">
                {nutrition.caffeineMg} mg
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Peso × 3
              </p>
            </div>

            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5">
              <p className="text-[11px] text-zinc-400">Ômega</p>
              <p className="text-lg font-mono tabular-nums font-bold text-zinc-100 mt-1">
                {nutrition.omegaMg} mg
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Peso × 25
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Comparative Evolution Charts */}
      <AssessmentEvolutionSection assessments={assessments} accent="orange" />

      {/* Bloco A — Anamnese, Hábitos & PAR-Q */}
      {hasAnamnesisBlock && (
        <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-xl font-bold text-zinc-50">
            Anamnese & Rotina
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {latest.sleepHours !== undefined && (
              <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5">
                <span className="text-zinc-400">Sono por noite: </span>
                <span className="font-mono font-semibold text-zinc-100">
                  {latest.sleepHours} h
                </span>
              </div>
            )}
            {latest.weeklyFrequency !== undefined && (
              <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5">
                <span className="text-zinc-400">Frequência semanal: </span>
                <span className="font-mono font-semibold text-zinc-100">
                  {latest.weeklyFrequency}x / semana
                </span>
              </div>
            )}
          </div>
          {latest.parq && (
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-zinc-200">Triagem PAR-Q: </span>
              <span className={positiveParq.length > 0 ? 'text-amber-300' : 'text-zinc-400'}>
                {positiveParq.length > 0
                  ? positiveParq.join(' · ')
                  : 'Sem apontamentos positivos'}
              </span>
            </div>
          )}
          {latest.clinicalHistory && (
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
              <strong className="text-zinc-100">Histórico clínico / restrições:</strong>{' '}
              {latest.clinicalHistory}
            </p>
          )}
        </section>
      )}

      {/* Perimetria & Simetria D/E */}
      {(trunkItems.length > 0 || symmetryRows.length > 0) && (
        <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-zinc-50">
              Perimetria & Simetria (cm)
            </h3>
          </div>

          {trunkItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {trunkItems.map((t) => (
                <div
                  key={t.label}
                  className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5"
                >
                  <p className="text-[11px] text-zinc-400">{t.label}</p>
                  <p className="text-sm font-mono tabular-nums font-bold text-zinc-100 mt-0.5">
                    {t.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {symmetryRows.length > 0 && (
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="py-1.5 pr-3 font-sans font-medium">Segmento</th>
                    <th className="py-1.5 pr-3 font-medium">Direito (D)</th>
                    <th className="py-1.5 font-medium">Esquerdo (E)</th>
                  </tr>
                </thead>
                <tbody>
                  {symmetryRows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-zinc-900 text-zinc-200"
                    >
                      <td className="py-1.5 pr-3 font-sans text-zinc-300">
                        {row.label}
                      </td>
                      <td className="py-1.5 pr-3">
                        {row.right !== undefined ? `${row.right} cm` : '—'}
                      </td>
                      <td className="py-1.5">
                        {row.left !== undefined ? `${row.left} cm` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Testes Físicos (Bloco E) */}
      {physicalTestItems.length > 0 && (
        <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-xl font-bold text-zinc-50">
            Testes Físicos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {physicalTestItems.map((test) => (
              <div
                key={test.label}
                className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5"
              >
                <p className="text-[11px] text-zinc-400">{test.label}</p>
                <p className="text-sm font-mono tabular-nums font-bold text-zinc-100 mt-0.5">
                  {test.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Posture Photos, Deviations & Notes */}
      {(hasPhotos || activeDeviations.length > 0 || latest.posturalNotes || latest.notes) && (
        <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-zinc-50">
            Avaliação Postural & Recomendações
          </h3>

          {activeDeviations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              <span>Observações posturais: {activeDeviations.join(' · ')}</span>
            </div>
          )}

          {hasPhotos && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Frente', src: latest.posturePhotos?.front },
                { label: 'Costas', src: latest.posturePhotos?.back },
                { label: 'Perfil', src: latest.posturePhotos?.profile },
              ]
                .filter((p) => Boolean(p.src))
                .map((photo) => (
                  <figure
                    key={photo.label}
                    className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden"
                  >
                    <img
                      src={photo.src}
                      alt={`Registro postural ${photo.label}`}
                      className="w-full h-56 object-cover"
                    />
                    <figcaption className="px-3 py-2 text-xs font-medium text-zinc-300 text-center">
                      {photo.label}
                    </figcaption>
                  </figure>
                ))}
            </div>
          )}

          {latest.posturalNotes && (
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
              <strong className="text-zinc-100">Postura:</strong> {latest.posturalNotes}
            </p>
          )}

          {latest.notes && (
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
              <strong className="text-zinc-100">Observações do professor:</strong>{' '}
              {latest.notes}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

