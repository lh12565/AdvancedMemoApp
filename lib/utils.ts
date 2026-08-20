export type Priority = 'low' | 'medium' | 'high';
export type Environment = 'home' | 'office' | 'cafe' | 'other';
export type Mood = 'happy' | 'neutral' | 'sad';

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  home: '家',
  office: '办公室',
  cafe: '咖啡馆',
  other: '其他',
};

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😫',
};

export function calculateSuggestedTime(
  priority: Priority,
  deadline: string | null
): string {
  if (!deadline) return '无截止日期';

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) return '已过期';
  if (daysLeft === 0) return '今天';
  if (daysLeft === 1) return '明天';

  const priorityLevel: Record<Priority, number> = {
    high: 1,
    medium: Math.ceil(daysLeft / 2),
    low: daysLeft,
  };

  const days = priorityLevel[priority];
  return `${days}天内`;
}

export function getDaysUntilDeadline(deadline: string | null): number {
  if (!deadline) return -1;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysLeft;
}

export function calculateDeadlineColor(
  deadline: string | null,
  completed: boolean
): string {
  if (completed) return '#10b981';

  if (!deadline) return '#6b7280';

  const daysLeft = getDaysUntilDeadline(deadline);

  if (daysLeft < 0) return '#ef4444';
  if (daysLeft <= 1) return '#ef4444';
  if (daysLeft <= 3) return '#f59e0b';

  return '#10b981';
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return '';

  const date = new Date(deadline);
  const daysLeft = getDaysUntilDeadline(deadline);

  if (daysLeft < 0) return '已过期';
  if (daysLeft === 0) return '今天截止';
  if (daysLeft === 1) return '明天截止';

  return `${daysLeft}天后截止`;
}
