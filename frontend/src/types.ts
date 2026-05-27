export interface TestResult {
  name: string;
  passed: boolean | null;
  error?: string;
}

export interface ComplexityInfo {
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  num_functions: number;
  num_classes: number;
  avg_function_length: number;
  max_nesting_depth: number;
  cyclomatic_complexity: number;
  size_category: string;
  complexity_score: number;
  difficulty: string;
  estimated_effort_hours: number;
  source_lang: string;
  target_lang: string;
}

export interface ModernizeResponse {
  original_code: string;
  modernized_code: string;
  documentation: string;
  unit_tests: string;
  test_results: TestResult[];
  confidence_score: number;
  change_summary: string;
  complexity: ComplexityInfo;
  architecture_diagram: string;
}

export interface HistoryEntry {
  id: number;
  filename: string;
  source_lang: string;
  target_lang: string;
  confidence_score: number;
  created_at: string;
}

export type StepStatus = "pending" | "active" | "complete" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
}

export interface SSEEvent {
  step: string;
  data: Record<string, unknown>;
  error?: string;
}

export type SourceLang =
  | "php"
  | "cobol"
  | "vb6"
  | "perl"
  | "fortran"
  | "pascal"
  | "java";
export type TargetLang = "python" | "typescript" | "go" | "java";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

