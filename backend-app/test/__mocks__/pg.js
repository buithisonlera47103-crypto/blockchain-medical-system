class Pool {
  constructor() {
    this._ended = false;
  }
  async query(_sql, _params) {
    // Minimal stub: return empty result set
    return { rows: [], rowCount: 0, command: 'SELECT' };
  }
  async end() {
    this._ended = true;
  }
}

module.exports = { Pool };

