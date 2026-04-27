"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  classroomCount: number;
  studentCount: number;
  examCount: number;
  avgScore: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const classrooms = await api.getClassrooms();

        // Fetch student counts for all classrooms in parallel
        const studentCounts = await Promise.all(
          classrooms.map(async (c) => {
            try {
              const students = await api.getStudents(c.id);
              return students.length;
            } catch {
              return 0;
            }
          })
        );

        const totalStudents = studentCounts.reduce(
          (sum, count) => sum + count,
          0
        );

        setStats({
          classroomCount: classrooms.length,
          studentCount: totalStudents,
          examCount: 0,
          avgScore: "—",
        });
      } catch {
        setStats({
          classroomCount: 0,
          studentCount: 0,
          examCount: 0,
          avgScore: "—",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "Utilisateur";

  const statCards = [
    {
      label: "Mes classes",
      value: stats ? String(stats.classroomCount) : "…",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      color: "bg-blue-50",
    },
    {
      label: "Étudiants inscrits",
      value: stats ? String(stats.studentCount) : "…",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: "bg-indigo-50",
    },
    {
      label: "Examens passés",
      value: stats ? String(stats.examCount) : "…",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14,2 14,8 20,8" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      ),
      color: "bg-emerald-50",
    },
    {
      label: "Score moyen",
      value: stats?.avgScore ?? "—",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      color: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting + role badge */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1B2A4A]">
            Bonjour, {firstName} 👋
          </h1>
          {user && (
            <Badge
              className={`text-xs font-medium px-2.5 py-0.5 ${
                user.role === "teacher"
                  ? "bg-[#2E75B6]/10 text-[#2E75B6] hover:bg-[#2E75B6]/10"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {user.role === "teacher" ? "Enseignant" : "Étudiant"}
            </Badge>
          )}
        </div>
        <p className="text-gray-500 mt-1">
          Bienvenue sur votre tableau de bord ora.IA
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="border border-gray-100 shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 rounded-xl p-3 w-12 h-12 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card
                key={stat.label}
                className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div
                      className={`${stat.color} rounded-xl p-3 shrink-0`}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-[#1B2A4A] mt-0.5">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
          Activité récente
        </h2>
        <Card className="border border-gray-100">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-gray-50 rounded-full p-4 mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9CA3AF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              Aucune activité pour le moment
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Vos dernières actions apparaîtront ici
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
