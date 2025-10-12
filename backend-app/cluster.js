const cluster = require('cluster');
const os = require('os');
const path = require('path');

const WORKERS = parseInt(process.env.CLUSTER_WORKERS || os.cpus().length);

if (cluster.isMaster) {
  console.log(`🚀 Master进程 ${process.pid} 正在运行`);
  console.log(`📊 CPU核心数: ${os.cpus().length}`);
  console.log(`👷 启动 ${WORKERS} 个Worker进程...`);
  
  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} 退出 (${code || signal})`);
    console.log('🔄 启动新的Worker...');
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} 已启动`);
  });

} else {
  // Worker进程
  require('./dist/index.js');
}
