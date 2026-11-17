import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import {
  PhysicalAssessment,
  calculateBMI,
  calculateWHR,
  formatDateBr,
  getReassessmentStatus,
} from '../types/workout';
import {
  fetchAssessmentsByStudentCpf,
  loadLocalAssessmentsByCpf,
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

export function StudentAssessmentView({
  studentCpf,
  studentName,
}: StudentAssessmentViewProps) {
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>(() =>
    loadLocalAssessmentsByCpf(studentCpf)
  );
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
    void loadData();
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
            Assim que seu professor realizar e salvar sua avaliação física presencial, seus resultados, composição corporal e gráficos comparativos aparecerão aqui.
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

  const activeDeviations = DEVIATION_LABELS.filter(
    (d) => latest.postureDeviations?.[d.key]
  ).map((d) => d.label);

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
              Minha Avaliação Física
            </p>
            <h2 className="font-display text-2xl font-bold text-zinc-50 mt-0.5">
              {studentName}
            </h2>
            <p className="text-xs font-mono tabular-nums text-zinc-400 mt-0.5">
              Última avaliação em {formatDateBr(latest.date)}
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
      </section>

      {/* Comparative Evolution Charts */}
      <AssessmentEvolutionSection assessments={assessments} accent="orange" />

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
