// ─── Types matching backend schemas ───────────────────────────────────────────

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  role: "teacher" | "student";
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface ClassroomResponse {
  id: number;
  name: string;
  description: string | null;
  teacher_id: number;
  created_at: string;
}

export interface EnrollmentResponse {
  id: number;
  classroom_id: number;
  student_id: number;
  enrolled_at: string;
}

export interface CourseMaterialResponse {
  id: number;
  classroom_id: number;
  filename: string;
  original_name: string;
  chunk_count: number;
  uploaded_at: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl = "http://localhost:8000";

  // ── Token management ────────────────────────────────────────────────────────

  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("ora_token", token);
      // Also set as cookie for middleware access
      document.cookie = `ora_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ora_token");
    }
    return null;
  }

  private clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ora_token");
      localStorage.removeItem("ora_user");
      document.cookie = "ora_token=; path=/; max-age=0";
    }
  }

  // ── Core fetch wrapper ──────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Only set Content-Type to JSON if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let message = `Erreur ${res.status}`;
      try {
        const body = await res.json();
        message = body.detail || message;
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async register(
    email: string,
    fullName: string,
    password: string,
    role: "teacher" | "student"
  ): Promise<UserResponse> {
    return this.request<UserResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        full_name: fullName,
        password,
        role,
      }),
    });
  }

  async login(email: string, password: string): Promise<UserResponse> {
    const data = await this.request<Token>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("ora_user", JSON.stringify(data.user));
    }
    return data.user;
  }

  async getMe(): Promise<UserResponse> {
    return this.request<UserResponse>("/auth/me");
  }

  logout(): void {
    this.clearToken();
  }

  // ── Classrooms ──────────────────────────────────────────────────────────────

  async getClassrooms(): Promise<ClassroomResponse[]> {
    return this.request<ClassroomResponse[]>("/classrooms/");
  }

  async createClassroom(
    name: string,
    description: string
  ): Promise<ClassroomResponse> {
    return this.request<ClassroomResponse>("/classrooms/", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getStudents(classroomId: number): Promise<UserResponse[]> {
    return this.request<UserResponse[]>(
      `/classrooms/${classroomId}/students`
    );
  }

  async enrollStudent(
    classroomId: number,
    studentEmail: string
  ): Promise<EnrollmentResponse> {
    return this.request<EnrollmentResponse>(
      `/classrooms/${classroomId}/enroll`,
      {
        method: "POST",
        body: JSON.stringify({ student_email: studentEmail }),
      }
    );
  }

  // ── Courses ─────────────────────────────────────────────────────────────────

  async getCourses(classroomId: number): Promise<CourseMaterialResponse[]> {
    return this.request<CourseMaterialResponse[]>(
      `/classrooms/${classroomId}/courses`
    );
  }

  async uploadCourse(
    classroomId: number,
    file: File
  ): Promise<CourseMaterialResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return this.request<CourseMaterialResponse>(
      `/classrooms/${classroomId}/courses/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  }
}

export const api = new ApiClient();
