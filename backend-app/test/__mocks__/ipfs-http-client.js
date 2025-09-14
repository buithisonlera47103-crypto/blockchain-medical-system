module.exports = {
  create: () => ({
    add: async data => ({
      path: 'mock-hash-' + Math.random().toString(36).substr(2, 9),
      size: data.length || 100,
    }),

    cat: async hash => {
      return Buffer.from('mock-file-content');
    },

    pin: {
      add: async hash => ({ hash }),
      rm: async hash => ({ hash }),
    },

    files: {
      stat: async path => ({
        size: 100,
        hash: 'mock-hash',
        type: 'file',
      }),
    },

    id: async () => ({
      id: 'mock-peer-id',
      publicKey: 'mock-public-key',
    }),

    version: async () => ({
      version: '0.60.1',
      commit: 'mock-commit',
    }),
  }),

  IPFSHTTPClient: class MockIPFSHTTPClient {
    constructor() {
      return module.exports.create();
    }
  },
};
