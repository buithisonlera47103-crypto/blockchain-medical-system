import React, { useEffect, useState } from 'react';

import { api } from '../../services/api';

interface BlockchainStatus {
  isConnected: boolean;
  retries: number;
  maxRetries: number;
  channelName: string;
  chaincodeName: string;
  org: string;
  timeoutMs: number;
}

const statusColor = (ok: boolean): string => (ok ? '#2e7d32' : '#c62828');

export default function BlockchainStatusCard(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BlockchainStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/v1/system/blockchain/status')
      .then((res) => {
        if (!mounted) return;
        setData(res.data?.data as BlockchainStatus);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div
          aria-label={data?.isConnected ? 'connected' : 'disconnected'}
          style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: statusColor(Boolean(data?.isConnected)), marginRight: 8 }}
        />
        <h3 style={{ margin: 0 }}>Blockchain Status</h3>
      </div>
      {loading && <p style={{ margin: 0, color: '#616161' }}>Loading...</p>}
      {error && <p style={{ margin: 0, color: '#c62828' }}>Error: {error}</p>}
      {!loading && !error && data && (
        <div style={{ fontSize: 14, color: '#424242' }}>
          <div>Connected: {String(data.isConnected)}</div>
          <div>Org: {data.org}</div>
          <div>Channel: {data.channelName}</div>
          <div>Chaincode: {data.chaincodeName}</div>
          <div>Retries: {data.retries}/{data.maxRetries}</div>
          <div>Timeout: {data.timeoutMs} ms</div>
        </div>
      )}
    </div>
  );
}

