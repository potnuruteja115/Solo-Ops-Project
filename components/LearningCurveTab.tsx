'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { LearningCurveStage } from '@/types';

interface CurvePayload {
  clientName: string;
  upcomingAgenda: string;
  stages: LearningCurveStage[];
}

export default function LearningCurveTab() {
  const [data, setData] = useState<CurvePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning-curve')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="clay-card flex items-center justify-center gap-2 p-8 text-xs text-[#5c554e]">
        <Loader2 className="h-4 w-4 animate-spin text-[#b8623f]" />
        Loading longitudinal learning curve...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="clay-card p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#b8623f]" />
          <h2 className="font-heading text-base font-bold text-[#2a2622]">
            Longitudinal Learning Curve · {data.clientName}
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#5c554e]">
          Objective: {data.upcomingAgenda}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.stages.map((st) => (
          <div key={st.stage} className="clay-card flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#e8e2d5] px-2.5 py-0.5 font-mono text-xs font-bold text-[#2a2622]">
                  {st.stage}
                </span>
                <span className="font-mono text-xs font-bold text-[#47594a]">
                  {st.automationAccuracy} Accuracy
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#b8623f]">
                {st.timeframe}
              </p>
              <h3 className="mt-1 font-heading text-base font-bold text-[#2a2622]">
                {st.title}
              </h3>
              <p className="mt-2 text-xs text-[#5c554e]">{st.summary}</p>
            </div>

            <div className="mt-4 border-t border-[#d8cfc0] pt-3">
              <div className="mb-2 flex justify-between font-mono text-[11px] text-[#5c554e]">
                <span>Entries: {st.trackedEntries}</span>
                <span>Risks Flagged: {st.detectedRisks}</span>
              </div>
              <ul className="space-y-1 text-xs text-[#2a2622]">
                {st.keyInsights.map((ins, i) => (
                  <li key={i}>· {ins}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
