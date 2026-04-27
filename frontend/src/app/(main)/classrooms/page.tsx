"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, type ClassroomResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function ClassroomsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchClassrooms = async () => {
    try {
      const data = await api.getClassrooms();
      setClassrooms(data);

      // Fetch student counts in parallel
      const counts: Record<number, number> = {};
      const results = await Promise.all(
        data.map(async (c) => {
          try {
            const students = await api.getStudents(c.id);
            return { id: c.id, count: students.length };
          } catch {
            return { id: c.id, count: 0 };
          }
        })
      );
      results.forEach(({ id, count }) => {
        counts[id] = count;
      });
      setStudentCounts(counts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createClassroom(newName, newDesc);
      toast.success("Classe créée avec succès !");
      setNewName("");
      setNewDesc("");
      setDialogOpen(false);
      setLoading(true);
      await fetchClassrooms();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setCreating(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  // Loading skeletons
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-6 space-y-3"
            >
              <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1B2A4A]">
          Mes classes
        </h1>
      </div>

      {classrooms.length === 0 ? (
        /* Empty state */
        <Card className="border border-gray-100">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 rounded-full p-5 mb-5">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2E75B6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Aucune classe pour le moment
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {isTeacher
                ? "Créez votre première classe pour commencer"
                : "Vous n'êtes inscrit dans aucune classe"}
            </p>
            {isTeacher && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    id="create-first-classroom"
                    className="text-white cursor-pointer"
                    style={{ backgroundColor: "#2E75B6" }}
                  >
                    Créer ma première classe
                  </Button>
                </DialogTrigger>
                <CreateClassroomDialog
                  name={newName}
                  setName={setNewName}
                  desc={newDesc}
                  setDesc={setNewDesc}
                  creating={creating}
                  onSubmit={handleCreate}
                />
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Classroom grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => router.push(`/classrooms/${classroom.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-[#1B2A4A] group-hover:text-[#2E75B6] transition-colors">
                    {classroom.name}
                  </h3>
                  <Badge variant="secondary" className="shrink-0 ml-2 text-xs">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {studentCounts[classroom.id] ?? 0}
                  </Badge>
                </div>
                {classroom.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {classroom.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Créée le{" "}
                  {new Date(classroom.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating action button */}
      {classrooms.length > 0 && isTeacher && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              id="fab-create-classroom"
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer"
              style={{ backgroundColor: "#2E75B6" }}
              title="Créer une classe"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </DialogTrigger>
          <CreateClassroomDialog
            name={newName}
            setName={setNewName}
            desc={newDesc}
            setDesc={setNewDesc}
            creating={creating}
            onSubmit={handleCreate}
          />
        </Dialog>
      )}
    </div>
  );
}

function CreateClassroomDialog({
  name,
  setName,
  desc,
  setDesc,
  creating,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  creating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nouvelle classe</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset disabled={creating} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classroom-name">Nom de la classe</Label>
            <Input
              id="classroom-name"
              placeholder="ex: Mathématiques L2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="classroom-desc">Description</Label>
            <Input
              id="classroom-desc"
              placeholder="ex: Algèbre linéaire et analyse 2024-2025"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </fieldset>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={creating}
            >
              Annuler
            </Button>
          </DialogClose>
          <Button
            id="submit-create-classroom"
            type="submit"
            disabled={creating}
            className="text-white cursor-pointer"
            style={{ backgroundColor: "#2E75B6" }}
          >
            {creating ? (
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
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
