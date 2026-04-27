"use client";

import { useState, useRef, use } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClassroom } from "@/lib/hooks/useClassroom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const classroomId = parseInt(id, 10);
  const { user } = useAuth();
  const {
    classroom,
    students,
    courses,
    loading,
    error,
    refetchStudents,
    refetchCourses,
  } = useClassroom(classroomId);

  // Enroll dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    try {
      await api.enrollStudent(classroomId, enrollEmail);
      toast.success("Étudiant inscrit avec succès !");
      setEnrollEmail("");
      setEnrollDialogOpen(false);
      await refetchStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    // Simulated progress bar (0→100% in ~2s)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      const result = await api.uploadCourse(classroomId, file);
      clearInterval(interval);
      setUploadProgress(100);
      toast.success(
        `PDF uploadé avec succès ! ${result.chunk_count} chunks indexés.`
      );
      await refetchCourses();
    } catch (err) {
      clearInterval(interval);
      toast.error(err instanceof Error ? err.message : "Erreur d'upload");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const isTeacher = user?.role === "teacher";

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-80 bg-gray-100 rounded-lg animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-red-50 rounded-full p-4 mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">{error}</p>
        <p className="text-sm text-gray-400 mt-1">
          Impossible de charger cette classe
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#1B2A4A]">
          {classroom?.name || "Chargement…"}
        </h1>
        {classroom?.description && (
          <p className="text-gray-500 mt-1">{classroom.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="students" className="cursor-pointer">
            Étudiants
            <Badge variant="secondary" className="ml-2 text-xs">
              {students.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="courses" className="cursor-pointer">
            Supports de cours
            <Badge variant="secondary" className="ml-2 text-xs">
              {courses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="exams" className="cursor-pointer">
            Examens
          </TabsTrigger>
        </TabsList>

        {/* ─── Students Tab ──────────────────────────────────── */}
        <TabsContent value="students">
          <Card className="border border-gray-100">
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    Aucun étudiant inscrit
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Invitez des étudiants par leur adresse email
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#2E75B6]/10 text-[#2E75B6] text-sm font-semibold">
                          {getInitials(student.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {student.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enroll button */}
              {isTeacher && (
                <div className="px-6 py-4 border-t border-gray-100">
                  <Dialog
                    open={enrollDialogOpen}
                    onOpenChange={setEnrollDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        id="enroll-student-button"
                        variant="outline"
                        className="w-full cursor-pointer"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="mr-2"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Ajouter un étudiant
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Inscrire un étudiant</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEnroll} className="space-y-4">
                        <fieldset disabled={enrolling} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="student-email">
                              Email de l&apos;étudiant
                            </Label>
                            <Input
                              id="student-email"
                              type="email"
                              placeholder="etudiant@exemple.com"
                              value={enrollEmail}
                              onChange={(e) => setEnrollEmail(e.target.value)}
                              required
                            />
                          </div>
                        </fieldset>
                        <DialogFooter className="gap-2">
                          <DialogClose asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="cursor-pointer"
                              disabled={enrolling}
                            >
                              Annuler
                            </Button>
                          </DialogClose>
                          <Button
                            id="submit-enroll"
                            type="submit"
                            disabled={enrolling}
                            className="text-white cursor-pointer"
                            style={{ backgroundColor: "#2E75B6" }}
                          >
                            {enrolling ? (
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
                                Inscription…
                              </span>
                            ) : (
                              "Inscrire"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Courses Tab ───────────────────────────────────── */}
        <TabsContent value="courses">
          <Card className="border border-gray-100">
            <CardContent className="p-0">
              {courses.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
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
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    Aucun support de cours
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Uploadez un fichier PDF pour commencer
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {course.original_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(course.uploaded_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {course.chunk_count} chunks
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload progress */}
              {uploading && (
                <div className="px-6 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <svg
                      className="animate-spin h-4 w-4 text-[#2E75B6]"
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
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-200"
                          style={{
                            width: `${uploadProgress}%`,
                            backgroundColor: "#2E75B6",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
              )}

              {/* Upload button */}
              {isTeacher && (
                <div className="px-6 py-4 border-t border-gray-100">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    id="upload-course-button"
                    variant="outline"
                    className="w-full cursor-pointer"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
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
                        Upload en cours…
                      </span>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="mr-2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17,8 12,3 7,8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Uploader un PDF
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Exams Tab ─────────────────────────────────────── */}
        <TabsContent value="exams">
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
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                  <path d="M9 15l2 2 4-4" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                Aucun examen lancé
              </p>
              <p className="text-sm text-gray-400 mt-1 mb-6">
                Les examens de cette classe apparaîtront ici
              </p>
              {isTeacher && (
                <Button
                  id="launch-exam-button"
                  className="text-white cursor-pointer"
                  style={{ backgroundColor: "#2E75B6" }}
                  disabled
                  title="Disponible bientôt"
                >
                  Lancer un examen
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
