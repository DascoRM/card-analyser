import {
  Session,
  SessionImage,
  GradeResult,
  CreateSessionDto,
  AnalyzeSessionDto,
  CardSide,
  GradeFeedback,
  SubmitFeedbackDto,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse error
    }
    throw new ApiError(response.status, errorMessage);
  }

  return response.json();
}

// Sessions API

export async function createSession(
  data: CreateSessionDto
): Promise<Session> {
  return fetchApi<Session>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getSession(
  sessionId: string,
  userId: number
): Promise<Session> {
  return fetchApi<Session>(`/sessions/${sessionId}?userId=${userId}`);
}

export async function getSessionImages(
  sessionId: string,
  userId: number
): Promise<SessionImage[]> {
  return fetchApi<SessionImage[]>(
    `/sessions/${sessionId}/images?userId=${userId}`
  );
}

// Images API

export async function uploadImage(
  sessionId: string,
  userId: number,
  file: File,
  side: CardSide
): Promise<SessionImage> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('side', side);

  const url = `${API_URL}/sessions/${sessionId}/images?userId=${userId}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore
    }
    throw new ApiError(response.status, errorMessage);
  }

  return response.json();
}

export async function deleteImage(
  sessionId: string,
  imageId: string,
  userId: number
): Promise<void> {
  await fetchApi(`/sessions/${sessionId}/images/${imageId}?userId=${userId}`, {
    method: 'DELETE',
  });
}

// Analysis API

export async function analyzeSession(
  sessionId: string,
  userId: number,
  data: AnalyzeSessionDto
): Promise<GradeResult> {
  return fetchApi<GradeResult>(`/sessions/${sessionId}/analyze?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getSessionResults(
  sessionId: string,
  userId: number
): Promise<GradeResult[]> {
  return fetchApi<GradeResult[]>(
    `/sessions/${sessionId}/results?userId=${userId}`
  );
}

// Feedback API

export async function submitFeedback(
  sessionId: string,
  resultId: string,
  userId: number,
  data: SubmitFeedbackDto
): Promise<GradeFeedback> {
  return fetchApi<GradeFeedback>(
    `/sessions/${sessionId}/results/${resultId}/feedback?userId=${userId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
}
