export interface DateTime {
  date: string;
  time: string;
}

export interface Blueprint {
  id: string;
  title: string;
  estimated_minutes: number;
  priority: number;
  subtasks: string[];
  deadline: DateTime;
  preferred_window: string;
  category: string;
  is_locked_time: boolean;
  locked_start_time: DateTime;
  priority_reasoning?: string;
}

export interface TaskData {
  title: string;
  estimated_minutes: number | string;
  deadline: DateTime;
  preferred_window: string;
  priority: number;
  category: string;
  is_locked_time: boolean;
  locked_start_time: DateTime;
  priority_reasoning?: string;
}