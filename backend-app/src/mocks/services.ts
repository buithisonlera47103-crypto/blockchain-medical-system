/**
 * 测试环境服务模拟器
 * 用于在测试环境中模拟外部服务
 */

export class MockBlockchainService {
  async initialize() {
    return { success: true, message: 'Mock blockchain service initialized' };
  }

  async createRecord(recordData: any) {
    return {
      success: true,
      transactionId: 'mock-tx-' + Date.now(),
      data: recordData
    };
  }

  async queryRecord(recordId: string) {
    return {
      success: true,
      data: { recordId, status: 'mock-record' }
    };
  }
}

export class MockIPFSService {
  async add(data: any) {
    return {
      cid: 'mock-cid-' + Date.now(),
      size: JSON.stringify(data).length
    };
  }

  async get(cid: string) {
    return {
      cid,
      data: 'mock-data',
      retrievedAt: new Date().toISOString()
    };
  }
}

export class MockDatabaseService {
  private data = new Map();

  async connect() {
    console.log('Mock database connected');
    return true;
  }

  async query(sql: string, params?: any[]) {
    console.log('Mock query:', sql, params);
    return [];
  }

  async insert(table: string, data: any) {
    const id = Date.now().toString();
    this.data.set(id, { id, ...data, table });
    return { insertId: id };
  }

  async findById(_table: string, _id: string) {
    return this.data.get(_id);
  }
}
