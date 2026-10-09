export type Priority = 'low' | 'medium' | 'high';
export type Task = {
  _id: string;
  title: string;
  description: string;
  scheduledAt: string;
  deadline: string;
  priority: Priority;
  category: string;
  completed: boolean;
};
export type TaskInput = Omit<Task, '_id' | 'completed'>;
export type Session = { token: string; user: { id: string; email: string } };
export type Sort = 'Smart' | 'Deadline' | 'Priority' | 'Scheduled';
