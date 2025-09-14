module.exports = {
  Issuer: {
    discover: async url => ({
      Client: class MockClient {
        constructor() {
          this.issuer = { metadata: { issuer: url } };
        }

        async authorizationUrl(params) {
          return 'https://mock-auth-url.com/auth?' + new URLSearchParams(params).toString();
        }

        async callback(redirectUri, params) {
          return {
            access_token: 'mock-access-token',
            id_token: 'mock-id-token',
            token_type: 'Bearer',
            expires_in: 3600,
          };
        }

        async userinfo(accessToken) {
          return {
            sub: 'mock-user-id',
            email: 'mock@example.com',
            name: 'Mock User',
          };
        }
      },
    }),
  },

  generators: {
    codeVerifier: () => 'mock-code-verifier',
    codeChallenge: () => 'mock-code-challenge',
    state: () => 'mock-state',
    nonce: () => 'mock-nonce',
  },

  custom: {
    setHttpOptionsDefaults: () => {},
  },
};
