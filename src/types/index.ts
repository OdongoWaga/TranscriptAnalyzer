export interface TranscriptAnalysis {
  courses: Course[];
  gpa?: string;
  totalCredits?: string;
  institution?: string;
  studentName?: string;
  degree?: string;
  graduationDate?: string;
}

export interface Course {
  code: string;
  name: string;
  grade: string;
  credits: string;
  semester?: string;
  year?: string;
}

export interface AnalysisResult {
  success: boolean;
  data?: TranscriptAnalysis;
  error?: string;
  rawResponse?: string;
}

export interface ImageUploadResult {
  success: boolean;
  imageUri?: string;
  error?: string;
}
