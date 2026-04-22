"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "teacher" | "student";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.register(email, fullName, password, role);
      toast.success("Compte créé avec succès ! Connectez-vous.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="register-fullname">Nom complet</Label>
        <Input
          id="register-fullname"
          type="text"
          placeholder="Jean Dupont"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="nom@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Mot de passe</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      {/* Role selection */}
      <div className="space-y-2">
        <Label>Je suis</Label>
        <div className="grid grid-cols-2 gap-3">
          {/* Teacher card */}
          <button
            id="role-teacher"
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              role === "teacher"
                ? "border-[#2E75B6] bg-[#2E75B6]/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            {/* Graduation cap icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={role === "teacher" ? "#2E75B6" : "#6B7280"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span
              className={`text-sm font-medium ${
                role === "teacher" ? "text-[#2E75B6]" : "text-gray-600"
              }`}
            >
              Enseignant
            </span>
          </button>

          {/* Student card */}
          <button
            id="role-student"
            type="button"
            onClick={() => setRole("student")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              role === "student"
                ? "border-[#2E75B6] bg-[#2E75B6]/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            {/* Person icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={role === "student" ? "#2E75B6" : "#6B7280"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 10-16 0" />
            </svg>
            <span
              className={`text-sm font-medium ${
                role === "student" ? "text-[#2E75B6]" : "text-gray-600"
              }`}
            >
              Étudiant
            </span>
          </button>
        </div>
      </div>

      <Button
        id="register-submit"
        type="submit"
        className="w-full text-white cursor-pointer"
        style={{ backgroundColor: "#2E75B6" }}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Création…
          </span>
        ) : (
          "Créer mon compte"
        )}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-[#2E75B6] hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
