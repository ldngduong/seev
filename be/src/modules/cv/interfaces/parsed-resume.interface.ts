export interface ResumeTextLine {
  pageNumber: number;
  text: string;
}

export interface CandidateHighlight {
  id: string;
  pageNumber: number;
  text: string;
}

export interface ParsedResume {
  text: string;
  totalPages: number;
  lines: ResumeTextLine[];
}
