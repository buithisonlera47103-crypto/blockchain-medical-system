module.exports = {
  default: class MockFabricCAServices {
    constructor() {
      this.caName = 'mock-ca';
    }

    async enroll() {
      return {
        certificate: 'mock-certificate',
        key: { toBytes: () => 'mock-private-key' },
      };
    }

    async register() {
      return 'mock-secret';
    }
  },
};
