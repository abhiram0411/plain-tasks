import { sortTasks } from '../src/tasks';
import { Task } from '../src/types';
const now = Date.parse('2026-10-09T12:00:00Z');
const make = (
  id: string,
  priority: Task['priority'],
  hours: number,
  completed = false,
): Task => ({
  _id: id,
  title: id,
  description: '',
  category: '',
  priority,
  completed,
  scheduledAt: new Date(now - 3600000).toISOString(),
  deadline: new Date(now + hours * 3600000).toISOString(),
});
test('smart ranking puts overdue work ahead of distant high priority work', () => {
  const tasks = [
    make('later', 'high', 100),
    make('overdue', 'low', -2),
    make('done', 'high', -10, true),
  ];
  expect(sortTasks(tasks, 'Smart', now).map(t => t._id)).toEqual([
    'overdue',
    'later',
    'done',
  ]);
  expect(tasks[0]._id).toBe('later');
});
test('deadline and priority sorts produce different useful orders', () => {
  const tasks = [make('urgent', 'low', 1), make('important', 'high', 48)];
  expect(sortTasks(tasks, 'Deadline', now)[0]._id).toBe('urgent');
  expect(sortTasks(tasks, 'Priority', now)[0]._id).toBe('important');
});
test('scheduled time breaks smart urgency in favor of work ready to start', () => {
  const ready = make('ready', 'medium', 24),
    future = {
      ...make('future', 'medium', 24),
      scheduledAt: new Date(now + 3600000).toISOString(),
    };
  expect(sortTasks([future, ready], 'Smart', now)[0]._id).toBe('ready');
  expect(sortTasks([future, ready], 'Scheduled', now)[0]._id).toBe('ready');
});
