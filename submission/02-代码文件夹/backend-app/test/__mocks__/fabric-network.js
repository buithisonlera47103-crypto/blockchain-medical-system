module.exports = {
  Gateway: class MockGateway {
    async connect() {}
    async disconnect() {}
    getNetwork() {
      return new MockNetwork();
    }
  },

  Network: class MockNetwork {
    getContract() {
      return new MockContract();
    }
  },

  Contract: class MockContract {
    async submitTransaction() {
      return Buffer.from('mock-result');
    }

    async evaluateTransaction() {
      return Buffer.from('mock-result');
    }
  },

  Wallets: {
    newFileSystemWallet: () => new MockWallet(),
    newInMemoryWallet: () => new MockWallet(),
  },

  Wallet: class MockWallet {
    async put() {}
    async get() {
      return { type: 'X.509', mspId: 'mock-msp' };
    }
    async list() {
      return ['mock-identity'];
    }
  },
};

class MockNetwork {
  getContract() {
    return new MockContract();
  }
}

class MockContract {
  async submitTransaction() {
    return Buffer.from('mock-result');
  }

  async evaluateTransaction() {
    return Buffer.from('mock-result');
  }
}

class MockWallet {
  async put() {}
  async get() {
    return { type: 'X.509', mspId: 'mock-msp' };
  }
  async list() {
    return ['mock-identity'];
  }
}
