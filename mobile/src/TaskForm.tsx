import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
  Pressable,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, Field, s } from './ui';
import { Priority, TaskInput } from './types';
export function TaskForm({
  onSave,
  onCancel,
}: {
  onSave: (input: TaskInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [category, setCategory] = useState(''),
    [priority, setPriority] = useState<Priority>('medium');
  const [scheduled, setScheduled] = useState(new Date()),
    [deadline, setDeadline] = useState(new Date(Date.now() + 86400000)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function pick(value: Date, set: (date: Date) => void) {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type === 'set' && time) set(time);
          },
        });
      },
    });
  }
  async function save() {
    if (!title.trim()) {
      setError('Give your task a title.');
      return;
    }
    if (deadline < scheduled) {
      setError('Deadline must be after the scheduled time.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priority,
        scheduledAt: scheduled.toISOString(),
        deadline: deadline.toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView style={s.screen} behavior="height">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <Text style={s.eyebrow}>PLAIN TASKS / NEW TASK</Text>
        <Text style={s.title}>What needs doing?</Text>
        <Field
          label="Title"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          editable={!busy}
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          editable={!busy}
        />
        <Text style={s.label}>Scheduled for</Text>
        <Button
          secondary
          label={scheduled.toLocaleString()}
          onPress={() => pick(scheduled, setScheduled)}
          disabled={busy}
        />
        <Text style={s.label}>Deadline</Text>
        <Button
          secondary
          label={deadline.toLocaleString()}
          onPress={() => pick(deadline, setDeadline)}
          disabled={busy}
        />
        <Text style={s.label}>Priority</Text>
        <View style={s.row}>
          {(['low', 'medium', 'high'] as Priority[]).map(p => (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ checked: p === priority }}
              disabled={busy}
              onPress={() => setPriority(p)}
              style={[s.chip, p === priority && s.selected]}
            >
              <Text style={[s.chipText, p === priority && s.selectedText]}>
                {p[0].toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Category (optional)"
          value={category}
          onChangeText={setCategory}
          maxLength={40}
          placeholder="Personal, work, study…"
          editable={!busy}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          label={busy ? 'Saving…' : 'Add task'}
          onPress={save}
          disabled={busy}
        />
        <Button secondary label="Cancel" onPress={onCancel} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
