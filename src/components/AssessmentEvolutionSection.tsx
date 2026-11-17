import { useMemo } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import {
  PhysicalAssessment,
  calculateBMI,
  formatDateBr,
} from '../types/workout';

interface AssessmentEvolutionSectionProps {
  assessments: PhysicalAssessment[];
  studentName?: string;
  accent?: 'purple' | 'orange';
}

interface MetricPoint {
  id: string;
  date: string;
  shortDate: string;
  weightKg: number;
  bmi: number | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  wellsBenchCm: number | null;
  pushups1Min: number | null;
  situps1Min: number | null;
  vo2Max: number | null;
}

function formatShortBr(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function formatDelta(
  current: number | null,
  previous: number | null,
  unit: string,
  preferLower: boolean
): { text: string; toneClass: string; direction: 'up' | 'down' | 'flat' } | null {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) {
    return {
      text: `0${unit}`,
      toneClass: 'text-zinc-400',
      direction: 'flat',
    };
  }
  const isUp = diff > 0;
  const isPositiveOutcome = preferLower ? !isUp : isUp;
  return {
    text: `${isUp ? '+' : ''}${diff}${unit}`,
    toneClass: isPositiveOutcome ? 'text-emerald-400' : 'text-amber-400',
    direction: isUp ? 'up' : 'down',
  };
}

export function AssessmentEvolutionSection({
  assessments,
  studentName,
  accent = 'purple',
}: AssessmentEvolutionSectionProps) {
  const points = useMemo<MetricPoint[]>(() => {
    const sorted = [...assessments].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-8).map((item) => {
      const bmiVal = item.bmi ?? calculateBMI(item.weightKg, item.heightCm)?.value ?? null;
      const bf = item.bodyFatPercent ?? null;
      const fatMass =
        item.fatMassKg ??
        (bf !== null && item.weightKg
          ? Math.round(item.weightKg * (bf / 100) * 10) / 10
          : null);
      const leanMass =
        item.leanMassKg ??
        (fatMass !== null && item.weightKg
          ? Math.round((item.weightKg - fatMass) * 10) / 10
          : null);

      return {
        id: item.id,
        date: item.date,
        shortDate: formatShortBr(item.date),
        weightKg: item.weightKg,
        bmi: bmiVal,
        bodyFatPercent: bf,
        leanMassKg: leanMass,
        fatMassKg: fatMass,
        wellsBenchCm: item.wellsBenchCm ?? null,
        pushups1Min: item.pushups1Min ?? null,
        situps1Min: item.situps1Min ?? null,
        vo2Max: item.vo2Max ?? null,
      };
    });
  }, [assessments]);

  if (points.length === 0) return null;

  const latest = points[points.length - 1];
  const previous = points.length >= 2 ? points[points.length - 2] : null;

  const maxWeight = Math.max(...points.map((p) => p.weightKg), 1);
  const bfPoints = points.filter((p) => p.bodyFatPercent !== null);
  const maxBf = Math.max(...bfPoints.map((p) => p.bodyFatPercent ?? 0), 1);
  const leanPoints = points.filter((p) => p.leanMassKg !== null);
  const maxLean = Math.max(...leanPoints.map((p) => p.leanMassKg ?? 0), 1);
  const hasAnyTests = points.some(
    (p) =>
      p.wellsBenchCm !== null ||
      p.pushups1Min !== null ||
      p.situps1Min !== null ||
      p.vo2Max !== null
  );

  const primaryBarClass =
    accent === 'orange' ? 'bg-orange-500' : 'bg-purple-500';
  const accentTextClass =
    accent === 'orange' ? 'text-orange-400' : 'text-purple-300';

  const weightDelta = formatDelta(latest.weightKg, previous?.weightKg ?? null, ' kg', false);
  const bfDelta = formatDelta(
    latest.bodyFatPercent,
    previous?.bodyFatPercent ?? null,
    '%',
    true
  );
  const leanDelta = formatDelta(
    latest.leanMassKg,
    previous?.leanMassKg ?? null,
    ' kg',
    false
  );
  const bmiDelta = formatDelta(latest.bmi, previous?.bmi ?? null, '', true);

  const kpis = [
    {
      label: 'Peso Atual',
      value: `${latest.weightKg} kg`,
      delta: weightDelta,
    },
    {
      label: '% Gordura',
      value: latest.bodyFatPercent !== null ? `${latest.bodyFatPercent}%` : '—',
      delta: bfDelta,
    },
    {
      label: 'Massa Magra',
      value: latest.leanMassKg !== null ? `${latest.leanMassKg} kg` : '—',
      delta: leanDelta,
    },
    {
      label: 'IMC',
      value: latest.bmi !== null ? `${latest.bmi}` : '—',
      delta: bmiDelta,
    },
  ];

  return (
    <section
      aria-label="Gráficos comparativos e evolução"
      className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-5 h-5 ${accentTextClass}`} aria-hidden="true" />
          <div>
            <h3 className="font-display text-xl font-bold text-zinc-50">
              Evolução & Comparativo
              {studentName ? ` · ${studentName}` : ''}
            </h3>
            <p className="text-xs text-zinc-400">
              {points.length === 1
                ? `Avaliação inicial registrada em ${formatDateBr(latest.date)}`
                : `${points.length} avaliações comparadas · Última em ${formatDateBr(latest.date)}`}
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPI Delta Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#0b0c0e] border border-zinc-800 rounded-xl px-3.5 py-3 space-y-1"
          >
            <p className="text-[11px] font-medium text-zinc-400">{kpi.label}</p>
            <p className="text-lg font-mono tabular-nums font-bold text-zinc-100">
              {kpi.value}
            </p>
            {kpi.delta ? (
              <p
                className={`text-[11px] font-mono tabular-nums font-semibold flex items-center gap-1 ${kpi.delta.toneClass}`}
              >
                {kpi.delta.direction === 'up' && (
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                )}
                {kpi.delta.direction === 'down' && (
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                )}
                <span>{kpi.delta.text} vs anterior</span>
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500">Referência atual</p>
            )}
          </div>
        ))}
      </div>

      {/* Comparative Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weight Progression */}
        <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">Peso Corporal (kg)</span>
            <span className="font-mono text-zinc-400">
              {points.length} registro{points.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="h-32 flex items-end gap-2 pt-4">
            {points.map((pt) => {
              const heightPct = Math.max(
                18,
                Math.round((pt.weightKg / maxWeight) * 100)
              );
              return (
                <div
                  key={pt.id}
                  className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end"
                >
                  <span className="text-[11px] font-mono tabular-nums font-semibold text-zinc-200">
                    {pt.weightKg}
                  </span>
                  <div
                    className={`w-full max-w-[34px] rounded-t-md ${primaryBarClass} transition-all`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {pt.shortDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Fat % Progression (or Lean Mass if BF missing) */}
        <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">
              {bfPoints.length > 0 ? '% de Gordura Corporal' : 'Massa Magra (kg)'}
            </span>
            <span className="font-mono text-zinc-400">
              {bfPoints.length > 0
                ? `${bfPoints.length} medição`
                : leanPoints.length > 0
                  ? `${leanPoints.length} medição`
                  : 'Aguardando dados'}
            </span>
          </div>

          {bfPoints.length > 0 ? (
            <div className="h-32 flex items-end gap-2 pt-4">
              {bfPoints.map((pt) => {
                const val = pt.bodyFatPercent ?? 0;
                const heightPct = Math.max(18, Math.round((val / maxBf) * 100));
                return (
                  <div
                    key={pt.id}
                    className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-orange-300">
                      {val}%
                    </span>
                    <div
                      className="w-full max-w-[34px] rounded-t-md bg-orange-500 transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                      {pt.shortDate}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : leanPoints.length > 0 ? (
            <div className="h-32 flex items-end gap-2 pt-4">
              {leanPoints.map((pt) => {
                const val = pt.leanMassKg ?? 0;
                const heightPct = Math.max(
                  18,
                  Math.round((val / maxLean) * 100)
                );
                return (
                  <div
                    key={pt.id}
                    className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-300">
                      {val}kg
                    </span>
                    <div
                      className="w-full max-w-[34px] rounded-t-md bg-emerald-500 transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                      {pt.shortDate}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
              Preencha Pollock ou Bioimpedância para visualizar o gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Physical Tests Comparison Table when available */}
      {hasAnyTests && (
        <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-4 space-y-2.5 overflow-x-auto">
          <p className="text-xs font-semibold text-zinc-200">
            Histórico de Testes Físicos
          </p>
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="py-1.5 pr-3 font-medium">Data</th>
                <th className="py-1.5 pr-3 font-medium">Wells (cm)</th>
                <th className="py-1.5 pr-3 font-medium">Flexões</th>
                <th className="py-1.5 pr-3 font-medium">Abdominais</th>
                <th className="py-1.5 font-medium">VO2 máx</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt) => (
                <tr key={pt.id} className="border-b border-zinc-900 text-zinc-200">
                  <td className="py-1.5 pr-3 text-zinc-400">{pt.shortDate}</td>
                  <td className="py-1.5 pr-3">{pt.wellsBenchCm ?? '—'}</td>
                  <td className="py-1.5 pr-3">{pt.pushups1Min ?? '—'}</td>
                  <td className="py-1.5 pr-3">{pt.situps1Min ?? '—'}</td>
                  <td className="py-1.5">{pt.vo2Max ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
