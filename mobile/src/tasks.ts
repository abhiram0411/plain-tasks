import { Task, Sort } from './types';
const weight = { low: 1, medium: 2, high: 3 };
// Fixed now makes the mixed ranking deterministic and testable.
export function smartScore(task: Task, now: number): number {
  const hoursLeft = (Date.parse(task.deadline) - now) / 3600000;
  const urgency =
    hoursLeft < 0 ? 100 + Math.min(72, -hoursLeft) : 72 / (1 + hoursLeft / 12);
  return (
    urgency +
    weight[task.priority] * 15 +
    (Date.parse(task.scheduledAt) <= now ? 10 : 0)
  );
}
export function sortTasks(tasks: Task[], mode: Sort, now = Date.now()): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed)
      return Number(a.completed) - Number(b.completed);
    const difference =
      mode === 'Smart'
        ? smartScore(b, now) - smartScore(a, now)
        : mode === 'Priority'
        ? weight[b.priority] - weight[a.priority]
        : Date.parse(mode === 'Deadline' ? a.deadline : a.scheduledAt) -
          Date.parse(mode === 'Deadline' ? b.deadline : b.scheduledAt);
    return (
      difference ||
      Date.parse(a.deadline) - Date.parse(b.deadline) ||
      a._id.localeCompare(b._id)
    );
  });
}
