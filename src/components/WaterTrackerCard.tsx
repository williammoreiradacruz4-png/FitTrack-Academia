import { useEffect, useState } from 'react';
import { Droplets, Minus, Plus } from 'lucide-react';
import { WaterLog, getLocalDateKey } from '../types/workout';

const WATER_STORAGE_KEY = 'fittrack_water_v1';
const GOAL_PRESETS = [2000, 2500, 3000, 3500];

function loadInitialWaterLog(): WaterLog {
  const today = getLocalDateKey();
  try {
    const raw = window.localStorage.getItem(WATER_STORAGE_KEY);
    if (!raw) {
      return { date: today, consumedMl: 0, goalMl: 2500 };
    }
    const parsed = JSON.parse(raw) as WaterLog;
    const safeGoal =
      typeof parsed.goalMl === 'number' && parsed.goalMl >= 500
        ? parsed.goalMl
        : 2500;
    if (parsed.date === today) {
      return {
        date: today,
        consumedMl: Math.max(0, Number(parsed.consumedMl) || 0),
        goalMl: safeGoal,
      };
    }
    // New day: reset intake to 0 while keeping user's goal
    return { date: today, consumedMl: 0, goalMl: safeGoal };
  } catch {
    return { date: today, consumedMl: 0, goalMl: 2500 };
  }
}

export function WaterTrackerCard() {
  const [waterLog, setWaterLog] = useState<WaterLog>(loadInitialWaterLog);
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(waterLog));
    } catch {
      // Ignore storage quota errors
    }
  }, [waterLog]);

  // Roll over automatically if midnight passes while app is open
  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = getLocalDateKey();
      setWaterLog((prev) =>
        prev.date === today ? prev : { date: today, consumedMl: 0, goalMl: prev.goalMl }
      );
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const handleAdjustWater = (deltaMl: number) => {
    const today = getLocalDateKey();
    setWaterLog((prev) => {
      const base = prev.date === today ? prev.consumedMl : 0;
      return {
        date: today,
        consumedMl: Math.max(0, base + deltaMl),
        goalMl: prev.goalMl,
      };
    });
  };

  const handleSelectGoal = (goalMl: number) => {
    setWaterLog((prev) => ({ ...prev, goalMl }));
    setEditingGoal(false);
  };

  const percent =
    waterLog.goalMl > 0
      ? Math.min(100, Math.round((waterLog.consumedMl / waterLog.goalMl) * 100))
      : 0;
  const reachedGoal = waterLog.consumedMl >= waterLog.goalMl;

  return (
    <section
      aria-label="Consumo de água diária"
      className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Droplets className="w-4 h-4 text-orange-400" aria-hidden="true" />
          <h2>Água diária</h2>
        </div>

        <button
          type="button"
          onClick={() => setEditingGoal((prev) => !prev)}
          className="text-xs font-mono tabular-nums text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer py-1 px-1.5 rounded"
        >
          Meta: {waterLog.goalMl} ml
        </button>
      </div>

      {editingGoal && (
        <div className="grid grid-cols-4 gap-1.5 mb-3 pb-3 border-b border-zinc-800/80">
          {GOAL_PRESETS.map((goal) => {
            const active = waterLog.goalMl === goal;
            return (
              <button
                key={goal}
                type="button"
                onClick={() => handleSelectGoal(goal)}
                className={`min-h-[38px] rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-zinc-950 font-bold'
                    : 'bg-[#0b0c0e] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {(goal / 1000).toFixed(1)}L
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xl font-bold font-mono tabular-nums text-zinc-50">
          {waterLog.consumedMl}{' '}
          <span className="text-xs font-normal text-zinc-400">/ {waterLog.goalMl} ml</span>
        </p>
        <span
          className={`text-xs font-mono tabular-nums font-semibold ${
            reachedGoal ? 'text-orange-400' : 'text-zinc-400'
          }`}
        >
          {reachedGoal ? 'Meta atingida' : `${percent}%`}
        </span>
      </div>

      <div
        className="w-full h-2 bg-[#0b0c0e] rounded-full overflow-hidden mt-2.5 border border-zinc-800/80"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso de consumo de água diária"
      >
        <div
          className="h-full bg-orange-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3.5">
        <button
          type="button"
          onClick={() => handleAdjustWater(-250)}
          disabled={waterLog.consumedMl === 0}
          aria-label="Remover 250 ml"
          className="min-h-[44px] px-2 rounded-xl bg-[#0b0c0e] border border-zinc-800 hover:border-zinc-700 text-xs font-mono tabular-nums font-medium text-zinc-300 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>250ml</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdjustWater(250)}
          className="min-h-[44px] px-2 rounded-xl bg-orange-500/15 border border-orange-500/40 hover:bg-orange-500/25 text-xs font-mono tabular-nums font-bold text-orange-300 flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>250ml</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdjustWater(500)}
          className="min-h-[44px] px-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-xs font-mono tabular-nums font-bold text-zinc-950 flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>500ml</span>
        </button>
      </div>
    </section>
  );
}
