export interface Blueprint {
  id: string;
  title: string;
  estimated_minutes: number;
  priority: number;
  subtasks: string[];
  deadline: DateTime;
  preferred_window: string;
  category: string;
  isSpecificTime: boolean;
  specific_start_time: DateTime;
  time: string;
}

export interface TaskData {
  title: string;
  estimated_minutes: number | string;
  deadline: DateTime;
  preferred_window: string;
  priority: number;
  category: string;
  isSpecificTime: boolean;
  specific_start_time: DateTime;
}

interface DateTime {
  date: string;
  time: string;
}