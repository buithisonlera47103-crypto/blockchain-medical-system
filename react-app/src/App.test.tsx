import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

// 简单的测试组件
const SimpleComponent = () => {
  return <div data-testid="simple-component">Hello Test</div>;
};

describe('Simple Test Suite', () => {
  test('renders simple component', () => {
    render(<SimpleComponent />);
    expect(screen.getByTestId('simple-component')).toBeInTheDocument();
    expect(screen.getByTestId('simple-component')).toHaveTextContent('Hello Test');
  });

  test('basic math operations', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  test('string operations', () => {
    const str = 'Hello World';
    expect(str).toContain('World');
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.length).toBe(11);
  });

  test('array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect(arr[0]).toBe(1);
  });

  test('object operations', () => {
    const obj = {
      name: 'Test User',
      age: 25,
      active: true,
    };

    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test User');
    expect(obj.age).toBeGreaterThan(18);
    expect(obj.active).toBeTruthy();
  });

  test('async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  test('error handling', () => {
    const throwError = () => {
      throw new Error('Test error');
    };

    expect(throwError).toThrow('Test error');
  });
});

describe('Environment Tests', () => {
  test('DOM environment is available', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  test('React Testing Library works', () => {
    const { container } = render(<div>Test</div>);
    expect(container).toBeInTheDocument();
  });
});
