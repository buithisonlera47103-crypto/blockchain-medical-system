#!/usr/bin/env node

/**
 * Redis连接测试脚本
 */

const Redis = require('ioredis');

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  connectTimeout: 10000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};

console.log('🔍 Redis连接配置:');
console.log(`   主机: ${redisConfig.host}:${redisConfig.port}`);
console.log(`   数据库: ${redisConfig.db}`);
console.log(`   密码: ${redisConfig.password ? '***' : '(无)'}`);

async function testRedisConnection() {
  let redis = null;
  
  try {
    console.log('\n🔗 正在连接Redis...');
    
    // 创建Redis连接
    redis = new Redis(redisConfig);
    
    // 连接到Redis
    await redis.connect();
    console.log('✅ Redis连接成功');
    
    // 测试基本操作
    console.log('\n📊 执行基本操作测试...');
    
    // 设置键值
    await redis.set('test:connection', 'success', 'EX', 60);
    console.log('✅ SET操作成功');
    
    // 获取值
    const value = await redis.get('test:connection');
    console.log('✅ GET操作成功, 值:', value);
    
    // 检查键是否存在
    const exists = await redis.exists('test:connection');
    console.log('✅ EXISTS操作成功, 存在:', exists === 1);
    
    // 获取Redis信息
    console.log('\n📋 Redis服务器信息...');
    const info = await redis.info('server');
    const lines = info.split('\r\n');
    const serverInfo = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          serverInfo[key] = value;
        }
      }
    });
    
    console.log(`   Redis版本: ${serverInfo.redis_version || 'Unknown'}`);
    console.log(`   运行模式: ${serverInfo.redis_mode || 'Unknown'}`);
    console.log(`   操作系统: ${serverInfo.os || 'Unknown'}`);
    console.log(`   架构: ${serverInfo.arch_bits || 'Unknown'} bits`);
    
    // 测试数据结构操作
    console.log('\n🗂️ 测试数据结构操作...');
    
    // Hash操作
    await redis.hset('test:hash', 'field1', 'value1', 'field2', 'value2');
    const hashValue = await redis.hget('test:hash', 'field1');
    console.log('✅ HASH操作成功, field1:', hashValue);
    
    // List操作
    await redis.lpush('test:list', 'item1', 'item2', 'item3');
    const listLength = await redis.llen('test:list');
    console.log('✅ LIST操作成功, 长度:', listLength);
    
    // Set操作
    await redis.sadd('test:set', 'member1', 'member2', 'member3');
    const setSize = await redis.scard('test:set');
    console.log('✅ SET操作成功, 大小:', setSize);
    
    // 测试过期时间
    console.log('\n⏰ 测试过期时间...');
    await redis.setex('test:expire', 5, 'will expire in 5 seconds');
    const ttl = await redis.ttl('test:expire');
    console.log('✅ TTL操作成功, 剩余时间:', ttl, '秒');
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    const deletedKeys = await redis.del(
      'test:connection',
      'test:hash',
      'test:list',
      'test:set',
      'test:expire'
    );
    console.log('✅ 清理完成, 删除键数量:', deletedKeys);
    
    return true;
    
  } catch (error) {
    console.error('❌ Redis连接失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   原因: 无法连接到Redis服务器');
      console.error('   建议: 检查Redis服务是否运行');
    } else if (error.message.includes('NOAUTH')) {
      console.error('   原因: 认证失败');
      console.error('   建议: 检查Redis密码配置');
    } else if (error.message.includes('WRONGPASS')) {
      console.error('   原因: 密码错误');
      console.error('   建议: 检查Redis密码');
    }
    
    return false;
    
  } finally {
    if (redis) {
      await redis.quit();
      console.log('\n🔌 Redis连接已关闭');
    }
  }
}

async function testRedisPerformance() {
  let redis = null;
  
  try {
    console.log('\n🚀 Redis性能测试...');
    
    redis = new Redis(redisConfig);
    await redis.connect();
    
    const testCount = 1000;
    const testData = 'x'.repeat(100); // 100字节测试数据
    
    // 写入性能测试
    console.log(`   测试写入 ${testCount} 个键...`);
    const writeStart = Date.now();
    
    const pipeline = redis.pipeline();
    for (let i = 0; i < testCount; i++) {
      pipeline.set(`perf:test:${i}`, testData);
    }
    await pipeline.exec();
    
    const writeTime = Date.now() - writeStart;
    const writeOps = Math.round(testCount / (writeTime / 1000));
    console.log(`   ✅ 写入完成: ${writeTime}ms, ${writeOps} ops/sec`);
    
    // 读取性能测试
    console.log(`   测试读取 ${testCount} 个键...`);
    const readStart = Date.now();
    
    const readPipeline = redis.pipeline();
    for (let i = 0; i < testCount; i++) {
      readPipeline.get(`perf:test:${i}`);
    }
    await readPipeline.exec();
    
    const readTime = Date.now() - readStart;
    const readOps = Math.round(testCount / (readTime / 1000));
    console.log(`   ✅ 读取完成: ${readTime}ms, ${readOps} ops/sec`);
    
    // 清理性能测试数据
    const deletePipeline = redis.pipeline();
    for (let i = 0; i < testCount; i++) {
      deletePipeline.del(`perf:test:${i}`);
    }
    await deletePipeline.exec();
    console.log(`   ✅ 清理完成`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Redis性能测试失败:', error.message);
    return false;
    
  } finally {
    if (redis) {
      await redis.quit();
    }
  }
}

async function testRedisCluster() {
  try {
    console.log('\n🔗 测试Redis集群模式...');
    console.log('ℹ️  跳过集群测试 (当前使用单机模式)');
    return false;

  } catch (error) {
    console.log('ℹ️  Redis集群模式不可用 (这是正常的，如果使用单机模式)');
    return false;
  }
}

async function main() {
  console.log('🚀 开始Redis连接和功能测试...\n');
  
  // 1. 基本连接测试
  const basicSuccess = await testRedisConnection();
  
  if (basicSuccess) {
    // 2. 性能测试
    await testRedisPerformance();
    
    // 3. 集群测试
    await testRedisCluster();
    
    console.log('\n🎉 Redis连接和功能测试完成!');
    console.log('✅ Redis已准备就绪，可以开始使用');
  } else {
    console.log('\n❌ Redis连接失败，请检查配置和服务状态');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  testRedisConnection,
  testRedisPerformance,
  testRedisCluster
};
