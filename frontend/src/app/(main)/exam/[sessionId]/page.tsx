"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "@/lib/auth";
import { useExamSession } from "@/lib/hooks/useExamSession";
import { useVoiceRecorder } from "@/lib/hooks/useVoiceRecorder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";

// ─── Score Circle (SVG) ──────────────────────────────────────────────────────
function ScoreCircle({ score, max = 100, size = 100 }: { score: number; max?: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / max, 1);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2E75B6" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </svg>
  );
}

// ─── Metric Bar ──────────────────────────────────────────────────────────────
function MetricBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-[#1B2A4A]">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: "#2E75B6" }}
        />
      </div>
    </div>
  );
}

// ─── Voice Orb ───────────────────────────────────────────────────────────────
function VoiceOrb({ state, audioLevel }: {
  state: "ai" | "recording" | "thinking" | "idle";
  audioLevel: number;
}) {
  const color = state === "ai" ? "#2E75B6" : state === "recording" ? "#DC2626" : "#9CA3AF";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      {/* Pulse rings */}
      {(state === "ai" || state === "recording") && (
        <>
          <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ border: `2px solid ${color}` }} />
          <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ border: `2px solid ${color}`, animationDelay: "0.5s" }} />
        </>
      )}
      {/* Wave ring */}
      {state === "ai" && (
        <div className="absolute inset-[-8px] rounded-full animate-voice-wave" style={{ border: `1px solid ${color}40` }} />
      )}
      {/* Main orb */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center z-10 transition-colors duration-300"
        style={{ backgroundColor: color }}
      >
        {state === "thinking" ? (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-full" style={{
                animation: "thinking-dots 1.4s infinite ease-in-out",
                animationDelay: `${i * 0.16}s`,
              }} />
            ))}
          </div>
        ) : state === "recording" ? (
          /* Volume bars */
          <div className="flex items-end gap-[3px] h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[3px] bg-white rounded-full origin-bottom animate-bar-bounce"
                style={{
                  height: `${Math.max(8, (audioLevel / 100) * 32)}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.4 + Math.random() * 0.3}s`,
                }}
              />
            ))}
          </div>
        ) : (
          /* Mic/Speaker icon */
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            {state === "ai" ? (
              <>
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white" stroke="none" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            ) : (
              <>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Typewriter Text ─────────────────────────────────────────────────────────
function TypewriterText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const words = text.split(" ");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < words.length) {
        setDisplayed((d) => (d ? d + " " + words[i] : words[i]));
        i++;
      } else clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, words.length]);
  return <p className="text-center text-[#1B2A4A] text-lg leading-relaxed max-w-lg mx-auto">{displayed}<span className="animate-pulse">|</span></p>;
}

// ─── Side Panel Content ──────────────────────────────────────────────────────
function SidePanelContent({ state: s, isTeacher, onPause, onEnd }: {
  state: ReturnType<typeof useExamSession>["state"];
  isTeacher: boolean;
  onPause?: () => void;
  onEnd?: () => void;
}) {
  const verdictColor = s.verdict === "CORRECT" ? "bg-emerald-100 text-emerald-700"
    : s.verdict === "PARTIALLY_CORRECT" ? "bg-amber-100 text-amber-700"
    : s.verdict === "INCORRECT" ? "bg-red-100 text-red-700"
    : "bg-gray-100 text-gray-500";

  const bloomColors: Record<string, string> = {
    Remember: "bg-gray-100 text-gray-700", Understand: "bg-blue-100 text-blue-700",
    Apply: "bg-cyan-100 text-cyan-700", Analyze: "bg-violet-100 text-violet-700",
    Evaluate: "bg-amber-100 text-amber-700", Create: "bg-emerald-100 text-emerald-700",
  };

  const strategyLabels: Record<string, string> = {
    deepen: "Approfondissement", simplify: "Simplification",
    redirect: "Redirection", challenge: "Challenge",
  };

  return (
    <div className="space-y-5 p-1">
      {/* Score circle */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <ScoreCircle score={s.scores.total} size={100} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-[#1B2A4A]">{s.scores.total}</span>
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1">Score</span>
      </div>

      {/* Metric bars */}
      <Card className="border-gray-100"><CardContent className="p-4 space-y-3">
        <MetricBar label="Exactitude factuelle" value={s.scores.factual} />
        <MetricBar label="Profondeur" value={s.scores.depth} />
        <MetricBar label="Raisonnement" value={s.scores.reasoning} />
        <MetricBar label="Communication" value={s.scores.clarity} />
      </CardContent></Card>

      {/* Verdict */}
      <div className="space-y-1.5">
        <span className="text-xs text-gray-500 font-medium">Dernier verdict</span>
        <Badge className={`${verdictColor} text-xs`}>{s.verdict ?? "En attente"}</Badge>
      </div>

      {/* Bloom level */}
      <div className="space-y-1.5">
        <span className="text-xs text-gray-500 font-medium">Niveau Bloom</span>
        <Badge className={`${bloomColors[s.bloomLevel] || ""} text-xs`}>{s.bloomLevel}</Badge>
      </div>

      {/* Strategy */}
      <div className="space-y-1.5">
        <span className="text-xs text-gray-500 font-medium">Stratégie</span>
        <p className="text-sm text-[#1B2A4A] font-medium">{strategyLabels[s.strategy] || s.strategy}</p>
      </div>

      {/* HITL */}
      {isTeacher && (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Contrôle enseignant</p>
          <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={onPause}>Pause</Button>
          <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 cursor-pointer" onClick={onEnd}>Terminer</Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Exam Page ──────────────────────────────────────────────────────────
export default function ExamPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const exam = useExamSession(sessionId);
  const voice = useVoiceRecorder();
  const s = exam.state;

  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (!started || s.status === "finished") return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [started, s.status]);

  // Redirect when finished
  useEffect(() => {
    if (s.status === "finished" && started) {
      const t = setTimeout(() => router.push(`/results/${sessionId}`), 1500);
      return () => clearTimeout(t);
    }
  }, [s.status, started, router, sessionId]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const ss = (sec % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const handleStart = async () => {
    const granted = await voice.requestPermission();
    if (!granted) {
      setMicDenied(true);
      // Allow text fallback
    }
    setStarted(true);
    exam.startSession();
  };

  const handleStartTextOnly = () => {
    setMicDenied(false);
    setShowTextInput(true);
    setStarted(true);
    exam.startSession();
  };

  const handleMicClick = async () => {
    if (s.isAiSpeaking || s.isThinking) return;
    if (voice.isRecording) {
      const blob = await voice.stopRecording();
      if (blob) exam.sendAudio(blob);
    } else {
      await voice.startRecording();
      exam.setState((prev) => ({ ...prev, isRecording: true, status: "recording" }));
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    exam.sendText(textInput.trim());
    setTextInput("");
  };

  const handleEndExam = () => {
    setEndDialogOpen(false);
    exam.endExam();
  };

  const isTeacher = user?.role === "teacher";
  const orbState = s.isAiSpeaking ? "ai" : s.isThinking ? "thinking" : voice.isRecording ? "recording" : "idle";

  // ─── Start Overlay ────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="text-[#1B2A4A]">ora</span><span className="text-[#2E75B6]">.IA</span>
          </h1>
          <div>
            <h2 className="text-xl font-semibold text-[#1B2A4A]">Examen oral — {s.subject}</h2>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              L&apos;IA va vous poser des questions sur ce sujet.<br />
              Répondez oralement. Soyez précis et complet.
            </p>
          </div>

          {/* Language selector */}
          <div className="flex justify-center gap-2">
            {(["fr", "en"] as const).map((lang) => (
              <button key={lang} onClick={() => exam.setLanguage(lang)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  s.language === lang
                    ? "bg-[#2E75B6] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {micDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Micro non autorisé. Vous pouvez taper vos réponses.
              <Button size="sm" variant="outline" className="mt-2 w-full cursor-pointer" onClick={handleStartTextOnly}>
                Continuer sans micro
              </Button>
            </div>
          )}

          <Button
            id="start-exam-button"
            className="w-full text-white text-base py-6 cursor-pointer"
            style={{ backgroundColor: "#2E75B6" }}
            onClick={handleStart}
          >
            Commencer l&apos;examen
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Finished overlay ─────────────────────────────────────────────────────
  if (s.status === "finished") {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <div className="relative mx-auto w-fit">
            <ScoreCircle score={s.scores.total} size={120} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-[#1B2A4A]">{s.scores.total}</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[#1B2A4A]">Examen terminé !</h2>
          <p className="text-gray-500 text-sm">Redirection vers les résultats…</p>
        </motion.div>
      </div>
    );
  }

  // ─── Main Exam UI ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 md:-m-8">
      {/* Main zone */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-semibold text-[#1B2A4A] truncate text-sm">{s.subject}</h2>
            <Badge variant="secondary" className="text-xs shrink-0">{s.language.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="secondary" className="text-xs">Tour {Math.min(s.turn, s.maxTurns)} / {s.maxTurns}</Badge>
            <span className="text-sm font-mono text-gray-500">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Conversation zone */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={orbState}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Label */}
              <span className="text-sm font-medium text-gray-400">
                {s.isAiSpeaking ? "ora.IA" : s.isThinking ? "ora.IA" : voice.isRecording ? "Vous parlez..." : "En attente"}
              </span>

              {/* Orb */}
              <VoiceOrb state={orbState} audioLevel={voice.audioLevel} />

              {/* Text below orb */}
              {s.isAiSpeaking && <TypewriterText text={s.aiResponse} />}
              {s.isThinking && (
                <p className="text-sm text-gray-400 text-center">
                  ora.IA réfléchit...<br />
                  <span className="text-xs text-gray-300">{s.thinkingAgent}</span>
                </p>
              )}
              {voice.isRecording && s.transcript && (
                <p className="text-sm text-gray-400 italic text-center max-w-md">{s.transcript}</p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* History */}
          {s.history.length > 0 && (
            <div ref={historyRef} className="mt-8 w-full max-w-lg max-h-[200px] overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                {s.history.map((h, i) => (
                  <div key={i} className="text-sm text-gray-400 animate-fade-in-up">
                    <span className="font-medium text-gray-500">
                      {h.role === "student" ? "Vous" : "ora.IA"} :{" "}
                    </span>
                    {h.content.length > 100 ? h.content.slice(0, 100) + "…" : h.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
          {showTextInput ? (
            <form onSubmit={handleTextSubmit} className="flex gap-2 max-w-lg mx-auto">
              <Input
                value={textInput} onChange={(e) => setTextInput(e.target.value)}
                placeholder="Tapez votre réponse..." disabled={s.isThinking || s.isAiSpeaking}
                className="flex-1"
              />
              <Button type="submit" disabled={s.isThinking || s.isAiSpeaking || !textInput.trim()}
                className="text-white cursor-pointer" style={{ backgroundColor: "#2E75B6" }}
              >
                Envoyer
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-6">
              {/* Text fallback */}
              <button onClick={() => setShowTextInput(true)}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Taper ma réponse"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </div>
                <span className="text-[10px]">Taper</span>
              </button>

              {/* Mic button */}
              <button
                onClick={handleMicClick}
                disabled={s.isAiSpeaking || s.isThinking}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  voice.isRecording
                    ? "bg-[#DC2626] animate-pulse shadow-lg shadow-red-200"
                    : s.isAiSpeaking ? "bg-[#2E75B6] shadow-lg shadow-blue-200"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke={voice.isRecording || s.isAiSpeaking ? "white" : "#6B7280"}
                  strokeWidth="2" strokeLinecap="round"
                >
                  {s.isAiSpeaking ? (
                    <>
                      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white" stroke="none" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  ) : (
                    <>
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </>
                  )}
                </svg>
              </button>

              {/* End exam */}
              <button onClick={() => setEndDialogOpen(true)}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Terminer l'examen"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                </div>
                <span className="text-[10px]">Terminer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side panel — desktop */}
      <aside className="hidden lg:block w-72 border-l border-gray-100 bg-white overflow-y-auto p-5">
        <h3 className="text-sm font-semibold text-[#1B2A4A] mb-4">Métriques live</h3>
        <SidePanelContent state={s} isTeacher={isTeacher} onEnd={handleEndExam} />
      </aside>

      {/* Side panel — mobile FAB */}
      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-[#2E75B6] text-white shadow-lg flex items-center justify-center z-40 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-5 overflow-y-auto">
            <SheetTitle className="text-sm font-semibold text-[#1B2A4A] mb-4">Métriques live</SheetTitle>
            <SidePanelContent state={s} isTeacher={isTeacher} onEnd={handleEndExam} />
          </SheetContent>
        </Sheet>
      </div>

      {/* End exam dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Terminer l&apos;examen ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Êtes-vous sûr ? L&apos;examen sera noté sur les réponses données.
          </p>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="cursor-pointer">Annuler</Button>
            </DialogClose>
            <Button onClick={handleEndExam} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
              Terminer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
