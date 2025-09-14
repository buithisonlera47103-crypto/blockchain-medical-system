import React, { useEffect, useState } from 'react';

import { api } from '../../services/api';

interface HsmHealthData {
  provider: string;
  strict: boolean;
  status: 'up' | 'down' | 'degraded';
  message?: string;
  config: { modulePath: string | null; slot: number | null; hasPin: boolean; keyLabel: string | null };
  durationMs: number;
}

const statusColor = (status: HsmHealthData['status']): string => {
  if (status === 'up') return '#2e7d32';
  if (status === 'degraded') return '#f9a825';
  return '#c62828';
};

export default function HSMHealthCard(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HsmHealthData | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/v1/system/hsm/health')
      .then((res) => {
        if (!mounted) return;
        setData(res.data?.data as HsmHealthData);
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
          aria-label={data?.status ?? 'unknown'}
          style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: statusColor(data?.status ?? 'down'), marginRight: 8 }}
        />
        <h3 style={{ margin: 0 }}>HSM Health</h3>
      </div>
      {loading && <p style={{ margin: 0, color: '#616161' }}>Checking...</p>}
      {error && <p style={{ margin: 0, color: '#c62828' }}>Error: {error}</p>}
      {!loading && !error && data && (
        <div style={{ fontSize: 14, color: '#424242' }}>
          <div>Provider: {data.provider}</div>
          <div>Status: {data.status}</div>
          {data.message && <div>Message: {data.message}</div>}
          <div>Strict: {String(data.strict)}</div>
          <div>Probe time: {data.durationMs} ms</div>
          <div style={{ marginTop: 8, color: '#616161' }}>
            <div>Module: {data.config.modulePath ?? '-'}</div>
            <div>Slot: {data.config.slot ?? '-'}</div>
            <div>PIN configured: {String(data.config.hasPin)}</div>
            <div>Key label: {data.config.keyLabel ?? '-'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

