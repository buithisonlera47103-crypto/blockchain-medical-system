const axios = require('axios');

const services = [
  { name: '前端服务', url: 'http://localhost:3000', timeout: 5000 },
  { name: '后端服务', url: 'http://localhost:3001/health', timeout: 5000 },
  { name: 'API文档', url: 'http://localhost:3001/api-docs', timeout: 5000 }
];

async function checkService(service) {
  try {
    const response = await axios.get(service.url, { 
      timeout: service.timeout,
      validateStatus: (status) => status < 500 
    });
    return { 
      name: service.name, 
      status: 'OK', 
      code: response.status,
      responseTime: Date.now() - startTime 
    };
  } catch (error) {
    return { 
      name: service.name, 
      status: 'ERROR', 
      error: error.message 
    };
  }
}

async function runHealthCheck() {
  console.log('🏥 开始健康检查...\n');
  
  for (const service of services) {
    const startTime = Date.now();
    const result = await checkService(service);
    
    const status = result.status === 'OK' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
    if (result.responseTime) {
      console.log(`   响应时间: ${result.responseTime}ms`);
    }
  }
  
  console.log('\n🏥 健康检查完成');
}

if (require.main === module) {
  runHealthCheck().catch(console.error);
}

module.exports = { runHealthCheck, checkService };
