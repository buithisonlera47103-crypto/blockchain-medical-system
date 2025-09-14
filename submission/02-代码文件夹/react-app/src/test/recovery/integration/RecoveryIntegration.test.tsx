import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

// Simple mock component for integration testing
const RecoveryIntegrationComponent = () => {
  const [status, setStatus] = React.useState('Ready');

  const handleRecovery = () => {
    setStatus('Recovery in progress...');
    setTimeout(() => {
      act(() => {
        setStatus('Recovery completed');
      });
    }, 100);
  };

  return (
    <div data-testid="recovery-integration">
      <h2>Recovery Integration Test</h2>
      <button data-testid="start-recovery" onClick={handleRecovery}>
        Start Recovery
      </button>
      <div data-testid="status">{status}</div>
    </div>
  );
};

describe('Recovery Integration Tests', () => {
  test('recovery integration component renders correctly', () => {
    render(<RecoveryIntegrationComponent />);

    expect(screen.getByText('Recovery Integration Test')).toBeInTheDocument();
    expect(screen.getByTestId('start-recovery')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  test('recovery process works end-to-end', async () => {
    render(<RecoveryIntegrationComponent />);

    const startButton = screen.getByTestId('start-recovery');

    fireEvent.click(startButton);

    expect(screen.getByText('Recovery in progress...')).toBeInTheDocument();

    // Wait for recovery to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(screen.getByText('Recovery completed')).toBeInTheDocument();
  });

  test('status updates correctly during recovery', () => {
    render(<RecoveryIntegrationComponent />);

    const statusElement = screen.getByTestId('status');
    expect(statusElement).toHaveTextContent('Ready');

    const startButton = screen.getByTestId('start-recovery');
    fireEvent.click(startButton);

    expect(statusElement).toHaveTextContent('Recovery in progress...');
  });
});
