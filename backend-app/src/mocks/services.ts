/**
 * 测试环境服务模拟器
 * 用于在测试环境中模拟外部服务
 */

export class MockBlockchainService {
  async initialize(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Mock blockchain service initialized' };
  }

  async createRecord(recordData: Record<string, unknown>): Promise<{ success: boolean; transactionId: string; data: Record<string, unknown> }> {
    return {
      success: true,
      transactionId: `mock-tx-${Date.now()}`,
      data: recordData
    };
  }

  async queryRecord(recordId: string): Promise<{ success: boolean; data: { recordId: string; status: string } }> {
    return {
      success: true,
      data: { recordId, status: 'mock-record' }
    };
  }
}

export class MockIPFSService {
  async add(data: unknown): Promise<{ cid: string; size: number }> {
    return {
      cid: `mock-cid-${Date.now()}`,
      size: JSON.stringify(data).length
    };
  }

  async get(cid: string): Promise<{ cid: string; data: string; retrievedAt: string }> {
    return {
      cid,
      data: 'mock-data',
      retrievedAt: new Date().toISOString()
    };
  }
}

export class MockDatabaseService {
  private readonly data = new Map<string, Record<string, unknown>>();

  async connect(): Promise<boolean> {
    console.log('Mock database connected');
    return true;
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    console.log('Mock query:', sql, params);
    return [];
  }

  async insert(table: string, data: Record<string, unknown>): Promise<{ insertId: string }> {
    const id = Date.now().toString();
    this.data.set(id, { id, ...data, table });
    return { insertId: id };
  }

  async findById(_table: string, _id: string): Promise<Record<string, unknown> | undefined> {
    return this.data.get(_id);
  }
}
