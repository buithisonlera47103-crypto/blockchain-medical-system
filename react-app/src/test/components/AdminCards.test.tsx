import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import BlockchainStatusCard from '../../components/Admin/BlockchainStatusCard';
import HSMHealthCard from '../../components/Admin/HSMHealthCard';
import { api } from '../../services/api';

describe('Admin status cards', () => {
  beforeEach(() => {
    jest.spyOn(api, 'get').mockImplementation(((url: string) => {
      if (url.includes('/system/blockchain/status')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              isConnected: true,
              retries: 0,
              maxRetries: 3,
              channelName: 'mychannel',
              chaincodeName: 'emr_chaincode',
              org: 'Org1MSP',
              timeoutMs: 30000,
            },
          },
        });
      }
      if (url.includes('/system/hsm/health')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              provider: 'simulated',
              strict: false,
              status: 'up',
              message: 'OK',
              config: { modulePath: null, slot: 0, hasPin: false, keyLabel: null },
              durationMs: 5,
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders BlockchainStatusCard and shows basic fields', async () => {
    render(<BlockchainStatusCard />);

    // Heading
    expect(screen.getByText(/Blockchain Status/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Connected:/i)).toBeInTheDocument();
      expect(screen.getByText(/Org:/i)).toBeInTheDocument();
      expect(screen.getByText(/Channel:/i)).toBeInTheDocument();
      expect(screen.getByText(/Chaincode:/i)).toBeInTheDocument();
    });
  });

  it('renders HSMHealthCard and shows provider/status', async () => {
    render(<HSMHealthCard />);

    // Heading
    expect(screen.getByText(/HSM Health/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
      expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    });
  });
});
