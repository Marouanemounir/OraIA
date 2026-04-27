"use client";

import { useState, useCallback, useRef } from "react";

export type ExamStatus = "idle" | "waiting" | "recording" | "thinking" | "ai_speaking" | "finished";
export type Verdict = "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | null;
export type BloomLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
export type Strategy = "deepen" | "simplify" | "redirect" | "challenge";

export interface ExamScores {
  factual: number;
  depth: number;
  reasoning: number;
  clarity: number;
  total: number;
}

export interface HistoryEntry {
  role: "student" | "examiner";
  content: string;
  timestamp: number;
}

export interface ExamSessionState {
  status: ExamStatus;
  turn: number;
  maxTurns: number;
  isAiSpeaking: boolean;
  isRecording: boolean;
  isThinking: boolean;
  thinkingAgent: string;
  transcript: string;
  aiResponse: string;
  scores: ExamScores;
  verdict: Verdict;
  bloomLevel: BloomLevel;
  strategy: Strategy;
  history: HistoryEntry[];
  subject: string;
  language: "fr" | "en";
}

const MOCK_QUESTIONS_FR = [
  "Pouvez-vous m'expliquer les principes fondamentaux de ce concept et comment il s'applique dans un contexte réel ?",
  "Quelle est la différence entre ces deux approches, et dans quel cas privilégieriez-vous l'une par rapport à l'autre ?",
  "Pouvez-vous me donner un exemple concret qui illustre cette théorie ?",
  "Comment ce concept interagit-il avec les autres notions du cours ?",
  "Quelles sont les limites de cette approche et comment les surmonter ?",
  "Si vous deviez expliquer ce concept à un néophyte, comment procéderiez-vous ?",
  "Analysez les avantages et inconvénients de cette méthode dans un cadre professionnel.",
  "En conclusion, quels sont les trois points essentiels à retenir sur ce sujet ?",
];

const MOCK_QUESTIONS_EN = [
  "Can you explain the fundamental principles of this concept and how it applies in a real-world context?",
  "What is the difference between these two approaches, and when would you prefer one over the other?",
  "Can you give me a concrete example that illustrates this theory?",
  "How does this concept interact with other notions from the course?",
  "What are the limitations of this approach and how can they be overcome?",
  "If you had to explain this concept to a beginner, how would you proceed?",
  "Analyze the advantages and disadvantages of this method in a professional setting.",
  "In conclusion, what are the three key takeaways on this topic?",
];

const BLOOM_LEVELS: BloomLevel[] = [
  "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create",
];
const STRATEGIES: Strategy[] = ["deepen", "simplify", "redirect", "challenge"];
const VERDICTS: Verdict[] = ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useExamSession(sessionId: string) {
  const [state, setState] = useState<ExamSessionState>({
    status: "idle",
    turn: 0,
    maxTurns: 8,
    isAiSpeaking: false,
    isRecording: false,
    isThinking: false,
    thinkingAgent: "",
    transcript: "",
    aiResponse: "",
    scores: { factual: 0, depth: 0, reasoning: 0, clarity: 0, total: 0 },
    verdict: null,
    bloomLevel: "Remember",
    strategy: "deepen",
    history: [],
    subject: "Les algorithmes de tri",
    language: "fr",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const setLanguage = useCallback((lang: "fr" | "en") => {
    setState((s) => ({ ...s, language: lang }));
  }, []);

  const startSession = useCallback(() => {
    const questions =
      state.language === "fr" ? MOCK_QUESTIONS_FR : MOCK_QUESTIONS_EN;
    const firstQuestion = questions[0];

    setState((s) => ({
      ...s,
      status: "ai_speaking",
      isAiSpeaking: true,
      turn: 1,
      aiResponse: firstQuestion,
    }));

    // AI finishes speaking after 4s
    const t = setTimeout(() => {
      setState((s) => ({
        ...s,
        isAiSpeaking: false,
        status: "waiting",
        history: [
          { role: "examiner", content: firstQuestion, timestamp: Date.now() },
          ...s.history,
        ],
      }));
    }, 4000);
    timerRef.current.push(t);
  }, [state.language]);

  const simulateAiResponse = useCallback(
    (studentText: string) => {
      const agents = state.language === "fr"
        ? ["Analyse factuelle...", "Évaluation...", "Formulation de la question..."]
        : ["Fact checking...", "Grading...", "Formulating question..."];
      const questions =
        state.language === "fr" ? MOCK_QUESTIONS_FR : MOCK_QUESTIONS_EN;

      // Add student message to history
      setState((s) => ({
        ...s,
        isRecording: false,
        isThinking: true,
        thinkingAgent: agents[0],
        transcript: studentText,
        history: [
          { role: "student", content: studentText, timestamp: Date.now() },
          ...s.history,
        ],
      }));

      // Agent 1
      const t1 = setTimeout(() => {
        setState((s) => ({ ...s, thinkingAgent: agents[1] }));
      }, 1000);

      // Agent 2
      const t2 = setTimeout(() => {
        setState((s) => ({ ...s, thinkingAgent: agents[2] }));
      }, 2000);

      // AI speaks
      const t3 = setTimeout(() => {
        setState((s) => {
          const newTurn = s.turn + 1;
          const isFinished = newTurn > s.maxTurns;
          const nextQuestion =
            questions[Math.min(s.turn, questions.length - 1)];

          const newScores = {
            factual: Math.min(25, s.scores.factual + rand(2, 5)),
            depth: Math.min(25, s.scores.depth + rand(2, 5)),
            reasoning: Math.min(25, s.scores.reasoning + rand(2, 5)),
            clarity: Math.min(25, s.scores.clarity + rand(2, 5)),
            total: 0,
          };
          newScores.total =
            newScores.factual +
            newScores.depth +
            newScores.reasoning +
            newScores.clarity;

          const bloomIdx = Math.min(
            Math.floor(s.turn / 1.5),
            BLOOM_LEVELS.length - 1
          );

          return {
            ...s,
            isThinking: false,
            isAiSpeaking: !isFinished,
            status: isFinished ? "finished" : "ai_speaking",
            turn: newTurn,
            aiResponse: isFinished ? "" : nextQuestion,
            scores: newScores,
            verdict: VERDICTS[rand(0, 2)],
            bloomLevel: BLOOM_LEVELS[bloomIdx],
            strategy: STRATEGIES[rand(0, 3)],
          };
        });
      }, 2500);

      // AI finishes speaking
      const t4 = setTimeout(() => {
        setState((s) => {
          if (s.status === "finished") return s;
          return {
            ...s,
            isAiSpeaking: false,
            status: "waiting",
            history: [
              {
                role: "examiner",
                content: s.aiResponse,
                timestamp: Date.now(),
              },
              ...s.history,
            ],
          };
        });
      }, 5500);

      timerRef.current.push(t1, t2, t3, t4);
    },
    [state.language]
  );

  const sendAudio = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_blob: Blob) => {
      const mockTranscript =
        state.language === "fr"
          ? "Le tri rapide utilise le paradigme diviser pour régner avec une complexité moyenne de O(n log n)."
          : "Quick sort uses the divide and conquer paradigm with an average complexity of O(n log n).";
      simulateAiResponse(mockTranscript);
    },
    [simulateAiResponse, state.language]
  );

  const sendText = useCallback(
    (text: string) => {
      simulateAiResponse(text);
    },
    [simulateAiResponse]
  );

  const endExam = useCallback(() => {
    clearTimers();
    setState((s) => ({
      ...s,
      status: "finished",
      isAiSpeaking: false,
      isRecording: false,
      isThinking: false,
    }));
  }, [clearTimers]);

  return {
    state,
    setState,
    setLanguage,
    startSession,
    sendAudio,
    sendText,
    endExam,
  };
}
