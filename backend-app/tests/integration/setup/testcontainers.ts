import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'mysql2/promise';
import Redis from 'ioredis';

export interface TestContainers {
  mysql: StartedTestContainer;
  redis: StartedTestContainer;
  mysqlClient: Client;
  redisClient: Redis;
}

export class TestContainersManager {
  private containers: TestContainers | null = null;

  async start(): Promise<TestContainers> {
    console.log('🐳 Starting test containers...');

    try {
      // Start MySQL container
      console.log('📊 Starting MySQL container...');
      const mysqlContainer = await new GenericContainer('mysql:8.0')
        .withEnvironment({
          MYSQL_ROOT_PASSWORD: 'test_root_password',
          MYSQL_DATABASE: 'blockchain_emr_test',
          MYSQL_USER: 'test_user',
          MYSQL_PASSWORD: 'test_password',
        })
        .withExposedPorts(3306)
        .withWaitStrategy(Wait.forLogMessage('ready for connections'))
        .withStartupTimeout(120000)
        .start();

      // Start Redis container
      console.log('🔴 Starting Redis container...');
      const redisContainer = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
        .withStartupTimeout(60000)
        .start();

      // Create database client
      const mysqlClient = await this.createMySQLClient(mysqlContainer);

      // Create Redis client
      const redisClient = this.createRedisClient(redisContainer);

      // Initialize database schema
      await this.initializeDatabase(mysqlClient);

      this.containers = {
        mysql: mysqlContainer,
        redis: redisContainer,
        mysqlClient,
        redisClient,
      };

      console.log('✅ Test containers started successfully');
      return this.containers;
    } catch (error) {
      console.error('❌ Failed to start test containers:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.containers) return;

    console.log('🛑 Stopping test containers...');

    try {
      // Close database connections
      if (this.containers.mysqlClient) {
        await this.containers.mysqlClient.end();
      }

      if (this.containers.redisClient) {
        this.containers.redisClient.disconnect();
      }

      // Stop containers
      await Promise.all([this.containers.mysql.stop(), this.containers.redis.stop()]);

      this.containers = null;
      console.log('✅ Test containers stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping test containers:', error);
    }
  }

  getContainers(): TestContainers {
    if (!this.containers) {
      throw new Error('Test containers not started. Call start() first.');
    }
    return this.containers;
  }

  private async createMySQLClient(container: StartedTestContainer): Promise<Client> {
    const host = container.getHost();
    const port = container.getMappedPort(3306);

    const client = await require('mysql2/promise').createConnection({
      host,
      port,
      user: 'test_user',
      password: 'test_password',
      database: 'blockchain_emr_test',
      multipleStatements: true,
    });

    // Test connection
    await client.ping();
    console.log(`✅ MySQL client connected to ${host}:${port}`);

    return client;
  }

  private createRedisClient(container: StartedTestContainer): Redis {
    const host = container.getHost();
    const port = container.getMappedPort(6379);

    const client = new Redis({
      host,
      port,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    console.log(`✅ Redis client configured for ${host}:${port}`);
    return client;
  }

  private async initializeDatabase(client: Client): Promise<void> {
    console.log('🗄️ Initializing test database schema...');

    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('doctor', 'nurse', 'patient', 'admin') NOT NULL,
        phone_number VARCHAR(20),
        date_of_birth DATE,
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      );

      -- Medical records table
      CREATE TABLE IF NOT EXISTS medical_records (
        id VARCHAR(36) PRIMARY KEY,
        patient_id VARCHAR(36) NOT NULL,
        doctor_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        record_type ENUM('consultation', 'diagnosis', 'prescription', 'lab_result', 'imaging') NOT NULL,
        metadata JSON,
        blockchain_hash VARCHAR(64),
        ipfs_hash VARCHAR(64),
        storage_layer TINYINT DEFAULT 1,
        is_encrypted BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_doctor (doctor_id),
        INDEX idx_type (record_type),
        INDEX idx_created (created_at),
        INDEX idx_blockchain_hash (blockchain_hash),
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Permissions table
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        granter_id VARCHAR(36) NOT NULL,
        grantee_id VARCHAR(36) NOT NULL,
        permission ENUM('read', 'write', 'admin') NOT NULL,
        conditions JSON,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_record (record_id),
        INDEX idx_granter (granter_id),
        INDEX idx_grantee (grantee_id),
        INDEX idx_permission (permission),
        INDEX idx_expires (expires_at),
        INDEX idx_active (is_active),
        FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
        FOREIGN KEY (granter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (grantee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_permission (record_id, grantee_id, permission)
      );

      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36),
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_resource (resource_type, resource_id),
        INDEX idx_created (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        data JSON,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- File attachments table
      CREATE TABLE IF NOT EXISTS file_attachments (
        id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        ipfs_hash VARCHAR(64),
        storage_layer TINYINT DEFAULT 1,
        is_encrypted BOOLEAN DEFAULT TRUE,
        checksum VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record (record_id),
        INDEX idx_filename (filename),
        INDEX idx_ipfs_hash (ipfs_hash),
        FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
      );
    `;

    await client.execute(schema);
    console.log('✅ Test database schema initialized');
  }

  async seedTestData(client: Client): Promise<void> {
    console.log('🌱 Seeding test data...');

    const seedData = `
      -- Insert test users
      INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role, phone_number) VALUES
      ('test-doctor-1', 'doctor.test@blockchain-emr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Test', 'Doctor', 'doctor', '+1234567890'),
      ('test-nurse-1', 'nurse.test@blockchain-emr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Test', 'Nurse', 'nurse', '+1234567891'),
      ('test-patient-1', 'patient.test@blockchain-emr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Test', 'Patient', 'patient', '+1234567892'),
      ('test-admin-1', 'admin.test@blockchain-emr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Test', 'Admin', 'admin', '+1234567893');

      -- Insert test medical records
      INSERT IGNORE INTO medical_records (id, patient_id, doctor_id, title, description, record_type, metadata) VALUES
      ('test-record-1', 'test-patient-1', 'test-doctor-1', 'Initial Consultation', 'Patient presented with symptoms of headache and fever.', 'consultation', '{"symptoms": ["headache", "fever"], "diagnosis": "Viral infection", "treatment": "Rest and hydration"}'),
      ('test-record-2', 'test-patient-1', 'test-doctor-1', 'Follow-up Visit', 'Patient feeling better, symptoms subsiding.', 'consultation', '{"symptoms": ["mild headache"], "diagnosis": "Recovery", "treatment": "Continue rest"}');

      -- Insert test permissions
      INSERT IGNORE INTO permissions (id, record_id, granter_id, grantee_id, permission, expires_at) VALUES
      ('test-permission-1', 'test-record-1', 'test-doctor-1', 'test-nurse-1', 'read', DATE_ADD(NOW(), INTERVAL 30 DAY)),
      ('test-permission-2', 'test-record-2', 'test-doctor-1', 'test-nurse-1', 'read', DATE_ADD(NOW(), INTERVAL 30 DAY));
    `;

    await client.execute(seedData);
    console.log('✅ Test data seeded');
  }

  async cleanupTestData(client: Client): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    const cleanup = `
      DELETE FROM audit_logs WHERE user_id LIKE 'test-%';
      DELETE FROM sessions WHERE user_id LIKE 'test-%';
      DELETE FROM file_attachments WHERE record_id LIKE 'test-%';
      DELETE FROM permissions WHERE id LIKE 'test-%';
      DELETE FROM medical_records WHERE id LIKE 'test-%';
      DELETE FROM users WHERE id LIKE 'test-%';
    `;

    await client.execute(cleanup);
    console.log('✅ Test data cleaned up');
  }
}
