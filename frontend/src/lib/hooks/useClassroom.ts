"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  type ClassroomResponse,
  type UserResponse,
  type CourseMaterialResponse,
} from "../api";

/**
 * Hook that fetches all data for a single classroom:
 * classroom details, students list, and course materials.
 *
 * Returns loading/error states and granular refetch helpers.
 */
export function useClassroom(classroomId: number) {
  const [classroom, setClassroom] = useState<ClassroomResponse | null>(null);
  const [students, setStudents] = useState<UserResponse[]>([]);
  const [courses, setCourses] = useState<CourseMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classroomData, studentsData, coursesData] = await Promise.all([
        api.getClassroom(classroomId),
        api.getStudents(classroomId),
        api.getCourses(classroomId),
      ]);
      setClassroom(classroomData);
      setStudents(studentsData);
      setCourses(coursesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetchStudents = useCallback(async () => {
    const data = await api.getStudents(classroomId);
    setStudents(data);
  }, [classroomId]);

  const refetchCourses = useCallback(async () => {
    const data = await api.getCourses(classroomId);
    setCourses(data);
  }, [classroomId]);

  return {
    classroom,
    students,
    courses,
    loading,
    error,
    refetch: fetchAll,
    refetchStudents,
    refetchCourses,
  };
}
