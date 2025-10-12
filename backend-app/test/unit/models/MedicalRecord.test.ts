/**
 * MedicalRecord Model 单元测试
 */

import { CREATE_TABLES_SQL } from '../../../src/models/MedicalRecord';

describe('MedicalRecord Model', () => {
  describe('CREATE_TABLES_SQL', () => {
    it('应该包含正确的表名', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS medical_records');
    });

    it('应该包含所有必需的字段', () => {
      expect(CREATE_TABLES_SQL).toContain('id VARCHAR(36) PRIMARY KEY');
      expect(CREATE_TABLES_SQL).toContain('patient_id VARCHAR(36) NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('doctor_id VARCHAR(36) NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('hospital_id VARCHAR(36)');
      expect(CREATE_TABLES_SQL).toContain('record_type VARCHAR(50) NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('title VARCHAR(255) NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('content TEXT NOT NULL');
    });

    it('应该包含正确的默认值', () => {
      expect(CREATE_TABLES_SQL).toContain("status VARCHAR(20) DEFAULT 'active'");
      expect(CREATE_TABLES_SQL).toContain('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      expect(CREATE_TABLES_SQL).toContain('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      expect(CREATE_TABLES_SQL).toContain('is_encrypted BOOLEAN DEFAULT FALSE');
      expect(CREATE_TABLES_SQL).toContain("access_level VARCHAR(20) DEFAULT 'private'");
    });

    it('应该包含区块链相关字段', () => {
      expect(CREATE_TABLES_SQL).toContain('ipfs_cid VARCHAR(255)');
      expect(CREATE_TABLES_SQL).toContain('blockchain_tx_id VARCHAR(255)');
      expect(CREATE_TABLES_SQL).toContain('content_hash VARCHAR(255)');
      expect(CREATE_TABLES_SQL).toContain('encryption_key_id VARCHAR(255)');
    });

    it('应该包含元数据字段', () => {
      expect(CREATE_TABLES_SQL).toContain('metadata JSON');
    });

    it('应该包含所有必需的索引', () => {
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_patient_id (patient_id)');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_doctor_id (doctor_id)');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_status (status)');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_created_at (created_at)');
    });

    it('应该使用正确的数据类型', () => {
      // UUID字段使用VARCHAR(36)
      expect(CREATE_TABLES_SQL).toMatch(/id VARCHAR\(36\) PRIMARY KEY/);
      expect(CREATE_TABLES_SQL).toMatch(/patient_id VARCHAR\(36\) NOT NULL/);
      expect(CREATE_TABLES_SQL).toMatch(/doctor_id VARCHAR\(36\) NOT NULL/);
      expect(CREATE_TABLES_SQL).toMatch(/hospital_id VARCHAR\(36\)/);

      // 字符串字段
      expect(CREATE_TABLES_SQL).toMatch(/record_type VARCHAR\(50\) NOT NULL/);
      expect(CREATE_TABLES_SQL).toMatch(/title VARCHAR\(255\) NOT NULL/);
      expect(CREATE_TABLES_SQL).toMatch(/status VARCHAR\(20\) DEFAULT 'active'/);
      expect(CREATE_TABLES_SQL).toMatch(/access_level VARCHAR\(20\) DEFAULT 'private'/);

      // 文本和二进制字段
      expect(CREATE_TABLES_SQL).toContain('content TEXT NOT NULL');
      expect(CREATE_TABLES_SQL).toMatch(/ipfs_cid VARCHAR\(255\)/);
      expect(CREATE_TABLES_SQL).toMatch(/blockchain_tx_id VARCHAR\(255\)/);
      expect(CREATE_TABLES_SQL).toMatch(/content_hash VARCHAR\(255\)/);
      expect(CREATE_TABLES_SQL).toMatch(/encryption_key_id VARCHAR\(255\)/);

      // 布尔和JSON字段
      expect(CREATE_TABLES_SQL).toContain('is_encrypted BOOLEAN DEFAULT FALSE');
      expect(CREATE_TABLES_SQL).toContain('metadata JSON');
    });

    it('应该有正确的约束条件', () => {
      expect(CREATE_TABLES_SQL).toContain('PRIMARY KEY');
      expect(CREATE_TABLES_SQL).toContain('NOT NULL');
      expect(CREATE_TABLES_SQL).toContain('DEFAULT');
      expect(CREATE_TABLES_SQL).toContain('ON UPDATE CURRENT_TIMESTAMP');
    });

    it('应该遵循正确的SQL语法', () => {
      // 检查SQL语法是否正确
      const sql = CREATE_TABLES_SQL.trim();
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS medical_records');
      expect(sql).toContain(');');
      expect(sql).toContain('(');
      expect(sql).toContain(')');
    });

    it('应该包含所有医疗记录必需的业务字段', () => {
      // 检查业务逻辑相关的字段
      expect(CREATE_TABLES_SQL).toContain('patient_id'); // 患者ID
      expect(CREATE_TABLES_SQL).toContain('doctor_id');  // 医生ID
      expect(CREATE_TABLES_SQL).toContain('hospital_id'); // 医院ID
      expect(CREATE_TABLES_SQL).toContain('record_type'); // 记录类型
      expect(CREATE_TABLES_SQL).toContain('title');       // 标题
      expect(CREATE_TABLES_SQL).toContain('content');     // 内容
      expect(CREATE_TABLES_SQL).toContain('status');      // 状态
      expect(CREATE_TABLES_SQL).toContain('access_level'); // 访问级别
    });

    it('应该支持数据完整性', () => {
      // 检查外键相关字段长度是否合适
      expect(CREATE_TABLES_SQL).toMatch(/patient_id VARCHAR\(36\)/);
      expect(CREATE_TABLES_SQL).toMatch(/doctor_id VARCHAR\(36\)/);
      expect(CREATE_TABLES_SQL).toMatch(/hospital_id VARCHAR\(36\)/);

      // 检查时间戳字段
      expect(CREATE_TABLES_SQL).toContain('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      expect(CREATE_TABLES_SQL).toContain('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    });

    it('应该支持加密和安全特性', () => {
      expect(CREATE_TABLES_SQL).toContain('is_encrypted BOOLEAN DEFAULT FALSE');
      expect(CREATE_TABLES_SQL).toContain('encryption_key_id VARCHAR(255)');
      expect(CREATE_TABLES_SQL).toContain('content_hash VARCHAR(255)');
    });

    it('应该支持区块链集成', () => {
      expect(CREATE_TABLES_SQL).toContain('ipfs_cid VARCHAR(255)');
      expect(CREATE_TABLES_SQL).toContain('blockchain_tx_id VARCHAR(255)');
    });

    it('应该有适当的索引优化查询性能', () => {
      // 检查常用查询字段的索引
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_patient_id');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_doctor_id');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_status');
      expect(CREATE_TABLES_SQL).toContain('INDEX idx_created_at');

      // 确保索引创建在正确的字段上
      expect(CREATE_TABLES_SQL).toMatch(/INDEX idx_patient_id \(patient_id\)/);
      expect(CREATE_TABLES_SQL).toMatch(/INDEX idx_doctor_id \(doctor_id\)/);
      expect(CREATE_TABLES_SQL).toMatch(/INDEX idx_status \(status\)/);
      expect(CREATE_TABLES_SQL).toMatch(/INDEX idx_created_at \(created_at\)/);
    });
  });
});