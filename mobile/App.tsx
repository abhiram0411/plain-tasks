import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Keychain from 'react-native-keychain';
import { AuthScreen } from './src/AuthScreen';
import { TaskForm } from './src/TaskForm';
import { Button, Field, colors, s } from './src/ui';
import { Session, Task, TaskInput, Sort } from './src/types';
import { request, ApiError } from './src/api';
import { sortTasks } from './src/tasks';
const service = 'com.plaintasks.session';
function TaskList({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => Promise<void>;
}) {
  const [tasks, setTasks] = useState<Task[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [adding, setAdding] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  const [filter, setFilter] = useState('Open'),
    [sort, setSort] = useState<Sort>('Smart'),
    [query, setQuery] = useState(''),
    [now, setNow] = useState(Date.now());
  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        void onLogout();
      } else {
        setError((e as Error).message);
      }
    },
    [onLogout],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTasks(await request<Task[]>('/tasks', session.token));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [session.token, fail]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [load]);
  async function add(input: TaskInput) {
    try {
      const task = await request<Task>('/tasks', session.token, 'POST', input);
      setTasks(old => [task, ...old]);
      setAdding(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void onLogout();
      throw e;
    }
  }
  async function mutate(task: Task, remove = false) {
    setPending(old => [...old, task._id]);
    setError('');
    try {
      const result = await request<Task>(
        `/tasks/${task._id}`,
        session.token,
        remove ? 'DELETE' : 'PATCH',
        remove ? undefined : { completed: !task.completed },
      );
      setTasks(old =>
        remove
          ? old.filter(t => t._id !== task._id)
          : old.map(t => (t._id === task._id ? result : t)),
      );
    } catch (e) {
      fail(e);
    } finally {
      setPending(old => old.filter(id => id !== task._id));
    }
  }
  const visible = sortTasks(
    tasks.filter(
      t =>
        (filter === 'All' ||
          (filter === 'Done' ? t.completed : !t.completed)) &&
        `${t.title} ${t.description} ${t.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
    sort,
    now,
  );
  return (
    <View style={s.screen}>
      <FlatList
        data={visible}
        keyExtractor={t => t._id}
        contentContainerStyle={s.content}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={s.eyebrow}>PLAIN TASKS</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  Alert.alert(
                    'Sign out?',
                    'Your tasks will be here when you return.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign out', onPress: () => void onLogout() },
                    ],
                  )
                }
                style={{ padding: 12 }}
              >
                <Text style={s.label}>Sign out</Text>
              </Pressable>
            </View>
            <Text style={s.title}>Your tasks.</Text>
            <Text style={s.subtitle}>
              {tasks.filter(t => !t.completed).length} open ·{' '}
              {tasks.filter(t => t.completed).length} done
            </Text>
            <Text numberOfLines={1} style={s.subtitle}>
              {session.user.email}
            </Text>
            <Button label="+  Add task" onPress={() => setAdding(true)} />
            <Field
              label="Find a task"
              value={query}
              onChangeText={setQuery}
              placeholder="Search title, description or category"
            />
            <View style={s.row}>
              {['Open', 'Done', 'All'].map(f => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: filter === f }}
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.chip, filter === f && s.selected]}
                >
                  <Text style={[s.chipText, filter === f && s.selectedText]}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>Sort by</Text>
            <View style={s.row}>
              {(['Smart', 'Deadline', 'Priority', 'Scheduled'] as Sort[]).map(
                v => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sort === v }}
                    key={v}
                    onPress={() => setSort(v)}
                    style={[s.chip, sort === v && s.selected]}
                  >
                    <Text style={[s.chipText, sort === v && s.selectedText]}>
                      {v}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            {sort === 'Smart' && (
              <Text style={[s.subtitle, { fontSize: 13 }]}>
                Balances deadlines, priority and scheduled time.
              </Text>
            )}
            {!!error && (
              <View style={{ gap: 10 }}>
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
                <Button secondary label="Try again" onPress={load} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View
              accessibilityLabel="Loading tasks"
              style={{ gap: 16, paddingVertical: 24 }}
            >
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  style={{ height: 64, backgroundColor: '#E2E3D9' }}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: 36, gap: 8 }}>
              <Text style={s.label}>
                {error
                  ? 'Tasks could not be loaded.'
                  : query
                  ? 'No matching tasks.'
                  : filter === 'Done'
                  ? 'No completed tasks yet.'
                  : 'Nothing on this list.'}
              </Text>
              <Text style={s.subtitle}>
                {query
                  ? 'Try another search.'
                  : filter === 'Done'
                  ? 'Completed tasks appear here.'
                  : 'Add a task whenever you’re ready.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: colors.line,
              paddingVertical: 22,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Complete ${item.title}`}
                accessibilityState={{
                  checked: item.completed,
                  disabled: pending.includes(item._id),
                }}
                disabled={pending.includes(item._id)}
                onPress={() => void mutate(item)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.green,
                  borderRadius: 3,
                }}
              >
                {pending.includes(item._id) ? (
                  <ActivityIndicator color={colors.green} />
                ) : (
                  <Text style={{ color: colors.green, fontSize: 22 }}>
                    {item.completed ? '✓' : ''}
                  </Text>
                )}
              </Pressable>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: '600',
                    color: colors.ink,
                    textDecorationLine: item.completed
                      ? 'line-through'
                      : 'none',
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: item.completed
                      ? colors.muted
                      : Date.parse(item.deadline) < now
                      ? colors.error
                      : colors.green,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {item.completed
                    ? 'COMPLETED'
                    : Date.parse(item.deadline) < now
                    ? 'OVERDUE'
                    : 'OPEN'}{' '}
                  · {item.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            {!!item.description && (
              <Text style={s.subtitle}>{item.description}</Text>
            )}
            <Text style={s.subtitle}>
              Scheduled: {new Date(item.scheduledAt).toLocaleString()}
            </Text>
            <Text style={s.subtitle}>
              Due: {new Date(item.deadline).toLocaleString()}
            </Text>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={s.label}>{item.category}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
                disabled={pending.includes(item._id)}
                style={{ padding: 12 }}
                onPress={() =>
                  Alert.alert('Delete task?', item.title, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => void mutate(item, true),
                    },
                  ])
                }
              >
                <Text style={{ color: colors.error }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <Modal
        visible={adding}
        animationType="slide"
        onRequestClose={() => setAdding(false)}
      >
        <SafeAreaView style={s.screen}>
          <TaskForm onSave={add} onCancel={() => setAdding(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [restoring, setRestoring] = useState(true);
  useEffect(() => {
    Keychain.getGenericPassword({ service })
      .then(saved => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved.password);
            if (parsed.token && parsed.user?.email) setSession(parsed);
          } catch {
            /* Ignore malformed local session data. */
          }
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);
  const login = useCallback(async (value: Session) => {
    await Keychain.setGenericPassword(value.user.email, JSON.stringify(value), {
      service,
    });
    setSession(value);
  }, []);
  const logout = useCallback(async () => {
    try {
      await Keychain.resetGenericPassword({ service });
      setSession(null);
    } catch {
      Alert.alert('Could not sign out', 'Please try again.');
    }
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.screen}>
        {restoring ? (
          <ActivityIndicator
            style={{ flex: 1 }}
            color={colors.green}
            accessibilityLabel="Restoring session"
          />
        ) : session ? (
          <TaskList key={session.user.id} session={session} onLogout={logout} />
        ) : (
          <AuthScreen onSession={login} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
