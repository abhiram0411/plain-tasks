import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Button, Field } from '../src/ui';
import { AuthScreen } from '../src/AuthScreen';
import { request } from '../src/api';
jest.mock('../src/api', () => ({ request: jest.fn() }));
const mockedRequest = request as jest.Mock;
function button(tree: Renderer.ReactTestRenderer, label: string) {
  return tree.root.findAllByType(Button).find(p => p.props.label === label)!;
}
test('registration sends credentials and accepts returned session', async () => {
  const onSession = jest.fn().mockResolvedValue(undefined);
  const session = { token: 'token', user: { id: '1', email: 'a@example.com' } };
  mockedRequest.mockResolvedValue(session);
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<AuthScreen onSession={onSession} />);
  });
  await act(async () => {
    button(tree, 'New here? Create an account').props.onPress();
  });
  await act(async () => {
    const fields = tree.root.findAllByType(Field);
    fields[0].props.onChangeText('a@example.com');
    fields[1].props.onChangeText('password123');
  });
  await act(async () => {
    await button(tree, 'Create account').props.onPress();
  });
  expect(mockedRequest).toHaveBeenCalledWith(
    '/auth/register',
    undefined,
    'POST',
    { email: 'a@example.com', password: 'password123' },
  );
  expect(onSession).toHaveBeenCalledWith(session);
  await act(async () => {
    tree.unmount();
  });
});
test('invalid inputs do not call API', async () => {
  mockedRequest.mockClear();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<AuthScreen onSession={jest.fn()} />);
  });
  await act(async () => {
    await button(tree, 'Sign in').props.onPress();
  });
  expect(mockedRequest).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('at least 8 characters');
  await act(async () => {
    tree.unmount();
  });
});
