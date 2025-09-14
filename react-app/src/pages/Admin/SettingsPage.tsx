import React from 'react';

import BlockchainStatusCard from '../../components/Admin/BlockchainStatusCard';
import HSMHealthCard from '../../components/Admin/HSMHealthCard';

export default function SettingsPage(): JSX.Element {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>System Settings & Health</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <BlockchainStatusCard />
        <HSMHealthCard />
      </div>
    </div>
  );
}

