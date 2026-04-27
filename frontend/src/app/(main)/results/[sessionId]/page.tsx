"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Animated Score Circle ───────────────────────────────────────────────────
function AnimatedScore({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const r = 52;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return (
    <div className="relative w-[130px] h-[130px]">
      <svg width="130" height="130" className="transform -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r} fill="none" stroke="#2E75B6" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#1B2A4A]">{value}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  );
}

// ─── Animated Bar ────────────────────────────────────────────────────────────
function AnimatedBar({ label, value, max = 25, delay = 0 }: { label: string; value: number; max?: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-[#1B2A4A]">{value}/{max}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: "#2E75B6" }}
        />
      </div>
    </div>
  );
}

// ─── Bloom Pyramid ───────────────────────────────────────────────────────────
const BLOOM_LEVELS = [
  { name: "Create", color: "#059669" },
  { name: "Evaluate", color: "#D97706" },
  { name: "Analyze", color: "#7C3AED" },
  { name: "Apply", color: "#0891B2" },
  { name: "Understand", color: "#2563EB" },
  { name: "Remember", color: "#6B7280" },
];

function BloomPyramid({ achieved }: { achieved: string }) {
  const achievedIdx = BLOOM_LEVELS.findIndex((l) => l.name === achieved);
  return (
    <div className="flex flex-col items-center gap-1">
      {BLOOM_LEVELS.map((level, i) => {
        const isAchieved = i >= achievedIdx && achievedIdx !== -1;
        const w = 40 + (BLOOM_LEVELS.length - i) * 22;
        return (
          <motion.div
            key={level.name}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            className={`h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
              isAchieved ? "text-white shadow-sm" : "text-gray-400 bg-gray-50 border border-gray-100"
            }`}
            style={{
              width: `${w}px`,
              backgroundColor: isAchieved ? level.color : undefined,
            }}
          >
            {level.name}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_RESULTS = {
  score: 72,
  factual: 18,
  depth: 17,
  reasoning: 20,
  clarity: 17,
  bloomLevel: "Analyze" as const,
  strengths: [
    "Bonne maîtrise des concepts fondamentaux",
    "Raisonnement logique structuré",
  ],
  weaknesses: [
    "Manque de précision sur les cas limites",
    "Vocabulaire technique à approfondir",
  ],
  remediation: [
    { concept: "Complexité algorithmique", ref: "Voir chapitre 3 du cours, page 42", },
    { concept: "Cas limites du tri rapide", ref: "Voir exercices section 4.2, page 67", },
    { concept: "Analyse amortie", ref: "Voir annexe B du polycopié, page 112", },
  ],
};

// ─── Results Page ────────────────────────────────────────────────────────────
export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const r = MOCK_RESULTS;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#1B2A4A]">
          Résultats de l&apos;examen
        </h1>
        <p className="text-gray-500 text-sm">Session #{sessionId}</p>
      </motion.div>

      {/* Score circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }} className="flex justify-center"
      >
        <AnimatedScore target={r.score} />
      </motion.div>

      {/* Metric bars */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-gray-100">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-2">Détail des scores</h3>
            <AnimatedBar label="Exactitude factuelle" value={r.factual} delay={600} />
            <AnimatedBar label="Profondeur" value={r.depth} delay={800} />
            <AnimatedBar label="Raisonnement" value={r.reasoning} delay={1000} />
            <AnimatedBar label="Communication" value={r.clarity} delay={1200} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Bloom pyramid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="border-gray-100">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-4">Niveau Bloom atteint</h3>
            <div className="flex justify-center">
              <BloomPyramid achieved={r.bloomLevel} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strengths & Weaknesses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              Forces
            </h3>
            <ul className="space-y-2">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Axes d&apos;amélioration
            </h3>
            <ul className="space-y-2">
              {r.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Remediation */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
        <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Plan de remédiation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {r.remediation.map((item, i) => (
            <Card key={i} className="border-gray-100 hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <Badge variant="secondary" className="text-xs">{i + 1}</Badge>
                <p className="text-sm font-medium text-[#1B2A4A]">{item.concept}</p>
                <p className="text-xs text-gray-500">{item.ref}</p>
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs cursor-pointer">
                  Revoir ce concept
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
        className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
      >
        <Button
          onClick={() => router.push("/exam/new")}
          className="text-white cursor-pointer px-8"
          style={{ backgroundColor: "#2E75B6" }}
        >
          Repasser l&apos;examen
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="cursor-pointer px-8">
          Retour au tableau de bord
        </Button>
      </motion.div>
    </div>
  );
}
