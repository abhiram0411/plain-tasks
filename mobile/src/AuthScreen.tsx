import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { Button, Field, s } from './ui';
import { request } from './api';
import { Session } from './types';
export function AuthScreen({
  onSession,
}: {
  onSession: (session: Session) => Promise<void>;
}) {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit() {
    if (!email.trim() || password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSession(
        await request<Session>(
          `/auth/${register ? 'register' : 'login'}`,
          undefined,
          'POST',
          { email: email.trim(), password },
        ),
      );
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
        contentContainerStyle={[
          s.content,
          { flexGrow: 1, justifyContent: 'center' },
        ]}
      >
        <Text style={s.eyebrow}>PLAIN TASKS</Text>
        <Text style={s.title}>
          {register ? 'Create your account.' : 'Welcome back.'}
        </Text>
        <Text style={s.subtitle}>
          {register
            ? 'Keep your tasks in one place.'
            : 'Sign in to pick up where you left off.'}
        </Text>
        <View style={[s.rule, { marginVertical: 12 }]} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!busy}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={register ? 'new-password' : 'current-password'}
          editable={!busy}
          onSubmitEditing={submit}
        />
        {register && <Text style={s.subtitle}>Use at least 8 characters.</Text>}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          label={
            busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'
          }
          onPress={submit}
          disabled={busy}
        />
        <Button
          secondary
          label={
            register
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'
          }
          onPress={() => {
            setRegister(!register);
            setError('');
          }}
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
