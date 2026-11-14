import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 5000 }: SplashScreenProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progressStarted, setProgressStarted] = useState(false);

  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => {
      setProgressStarted(true);
    });

    const fadeOutMs = 400;
    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, Math.max(0, durationMs - fadeOutMs));

    const doneTimer = window.setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(startFrame);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs, onFinish]);

  const handleSkip = () => {
    setIsLeaving(true);
    window.setTimeout(onFinish, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tela de abertura FitTrack Academia"
      className={`fixed inset-0 z-[100] bg-[#0b0c0e] flex flex-col items-center justify-center px-6 transition-opacity duration-400 ease-out ${
        isLeaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle radial glow matching logo orange */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12)_0%,transparent_58%)]"
      />

      <div className="relative flex flex-col items-center text-center max-w-xs w-full">
        {/* PWA Logo Container */}
        <div
          className={`w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-white p-3.5 shadow-2xl shadow-black/70 ring-2 ring-orange-500/40 flex items-center justify-center transition-transform duration-500 ease-out ${
            progressStarted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <img
            src="/pwa-512x512.png"
            alt="FitTrack Academia"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 mt-6">
          Fit<span className="text-orange-500">Track</span>{' '}
          <span className="text-zinc-300 font-semibold">Academia</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5">Sua ficha de treino sempre à mão</p>

        {/* 5-second compositor-only progress bar */}
        <div className="w-full max-w-[220px] h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-7">
          <div
            className="h-full bg-orange-500 origin-left transition-transform ease-linear"
            style={{
              transform: progressStarted ? 'scaleX(1)' : 'scaleX(0)',
              transitionDuration: `${durationMs}ms`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 min-h-[44px] px-5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          Pular
        </button>
      </div>
    </div>
  );
}
