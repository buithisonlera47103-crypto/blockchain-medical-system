#!/usr/bin/env node

/**
 * 端到端系统测试脚本
 * 测试整个区块链医疗记录系统的集成功能
 */

const http = require('http');
const https = require('https');

// 测试配置
const config = {
    backend: {
        host: 'localhost',
        port: 3001,
        protocol: 'http'
    },
    frontend: {
        host: 'localhost', 
        port: 3000,
        protocol: 'http'
    },
    database: {
        host: 'localhost',
        port: 3306
    },
    redis: {
        host: 'localhost',
        port: 6379
    },
    ipfs: {
        host: 'localhost',
        port: 5001
    },
    blockchain: {
        orderer: 'localhost:7050',
        peer: 'localhost:7051'
    }
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// HTTP请求工具
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'https' ? https : http;
        
        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        data: null
                    };
                    
                    if (res.headers['content-type']?.includes('application/json')) {
                        try {
                            result.data = JSON.parse(body);
                        } catch (e) {
                            // 忽略JSON解析错误
                        }
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        
        req.end();
    });
}

// 测试结果收集
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
};

function addTestResult(name, passed, message = '', details = {}) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        log(`✅ ${name}`, colors.green);
        if (message) log(`   ${message}`, colors.cyan);
    } else {
        testResults.failed++;
        log(`❌ ${name}`, colors.red);
        if (message) log(`   ${message}`, colors.yellow);
    }
    
    testResults.details.push({
        name,
        passed,
        message,
        details,
        timestamp: new Date().toISOString()
    });
}

// 1. 测试前端服务
async function testFrontend() {
    log('\n🌐 测试前端服务...', colors.blue);
    
    try {
        const response = await makeRequest({
            hostname: config.frontend.host,
            port: config.frontend.port,
            path: '/',
            method: 'GET',
            timeout: 5000
        });
        
        const isRunning = response.statusCode === 200;
        addTestResult(
            '前端服务可访问性',
            isRunning,
            isRunning ? `状态码: ${response.statusCode}` : `状态码: ${response.statusCode}`,
            { statusCode: response.statusCode, contentLength: response.body.length }
        );
        
        // 检查是否包含React应用标识
        const hasReactContent = response.body.includes('root') || response.body.includes('React');
        addTestResult(
            '前端React应用加载',
            hasReactContent,
            hasReactContent ? '检测到React应用结构' : '未检测到React应用结构'
        );
        
    } catch (error) {
        addTestResult('前端服务可访问性', false, `连接错误: ${error.message}`);
    }
}

// 2. 测试后端API
async function testBackendAPI() {
    log('\n🔧 测试后端API服务...', colors.blue);
    
    // 健康检查
    try {
        const healthResponse = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/health',
            method: 'GET',
            timeout: 5000
        });
        
        const isHealthy = healthResponse.statusCode === 200;
        addTestResult(
            '后端健康检查',
            isHealthy,
            isHealthy ? '服务健康' : `状态码: ${healthResponse.statusCode}`,
            healthResponse.data
        );
        
    } catch (error) {
        addTestResult('后端健康检查', false, `连接错误: ${error.message}`);
    }
    
    // 测试认证API
    try {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'patient'
        };
        
        const registerResponse = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/api/v1/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }, testUser);
        
        const registerSuccess = (registerResponse.statusCode === 200 || registerResponse.statusCode === 201) && registerResponse.data?.userId;
        addTestResult(
            '用户注册功能',
            registerSuccess,
            registerSuccess ? `用户ID: ${registerResponse.data.userId}` : `状态码: ${registerResponse.statusCode}`,
            registerResponse.data
        );
        
        if (registerSuccess) {
            // 测试登录
            const loginResponse = await makeRequest({
                hostname: config.backend.host,
                port: config.backend.port,
                path: '/api/v1/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }, {
                username: testUser.username,
                password: testUser.password
            });
            
            const loginSuccess = loginResponse.statusCode === 200 && loginResponse.data?.token;
            addTestResult(
                '用户登录功能',
                loginSuccess,
                loginSuccess ? '获取到JWT令牌' : `状态码: ${loginResponse.statusCode}`,
                { hasToken: !!loginResponse.data?.token }
            );
        }
        
    } catch (error) {
        addTestResult('认证API测试', false, `请求错误: ${error.message}`);
    }
}

// 3. 测试数据库连接
async function testDatabase() {
    log('\n🗄️  测试数据库连接...', colors.blue);
    
    try {
        const response = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/health/services',
            method: 'GET',
            timeout: 5000
        });

        // 从服务健康检查响应中获取数据库状态
        const dbStatus = response.data?.services?.database?.status;
        const isConnected = dbStatus === 'up' || dbStatus === 'degraded';
        
        addTestResult(
            '数据库连接状态',
            isConnected,
            isConnected ? '数据库连接正常' : '数据库连接异常',
            { status: dbStatus }
        );
        
    } catch (error) {
        addTestResult('数据库连接测试', false, `测试失败: ${error.message}`);
    }
}

// 4. 测试缓存服务
async function testCache() {
    log('\n💾 测试缓存服务...', colors.blue);
    
    try {
        const response = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/health/services',
            method: 'GET',
            timeout: 5000
        });

        // 从服务健康检查响应中获取缓存状态
        const cacheStatus = response.data?.services?.redis?.status;
        const isWorking = cacheStatus === 'up' || cacheStatus === 'degraded';
        
        addTestResult(
            '缓存服务状态',
            isWorking,
            isWorking ? '缓存服务正常' : '缓存服务异常',
            { status: cacheStatus }
        );
        
    } catch (error) {
        addTestResult('缓存服务测试', false, `测试失败: ${error.message}`);
    }
}

// 5. 测试IPFS存储
async function testIPFS() {
    log('\n📁 测试IPFS存储...', colors.blue);
    
    try {
        const response = await makeRequest({
            hostname: config.ipfs.host,
            port: config.ipfs.port,
            path: '/api/v0/id',
            method: 'POST',
            timeout: 5000
        });
        
        const isRunning = response.statusCode === 200;
        addTestResult(
            'IPFS节点状态',
            isRunning,
            isRunning ? 'IPFS节点运行正常' : `状态码: ${response.statusCode}`,
            { statusCode: response.statusCode }
        );
        
    } catch (error) {
        addTestResult('IPFS存储测试', false, `连接错误: ${error.message}`);
    }
}

// 6. 测试区块链网络
async function testBlockchain() {
    log('\n⛓️  测试区块链网络...', colors.blue);
    
    try {
        const response = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/health/services',
            method: 'GET',
            timeout: 5000
        });

        // 从服务健康检查响应中获取区块链状态
        const blockchainStatus = response.data?.services?.blockchain?.status;
        const isConnected = blockchainStatus === 'up' || blockchainStatus === 'degraded';
        
        addTestResult(
            '区块链网络连接',
            isConnected,
            isConnected ? '区块链网络连接正常' : '区块链网络连接异常',
            { status: blockchainStatus }
        );
        
    } catch (error) {
        addTestResult('区块链网络测试', false, `测试失败: ${error.message}`);
    }
}

// 7. 测试前后端集成
async function testIntegration() {
    log('\n🔗 测试前后端集成...', colors.blue);
    
    // 检查CORS配置
    try {
        const response = await makeRequest({
            hostname: config.backend.host,
            port: config.backend.port,
            path: '/health',
            method: 'OPTIONS',
            headers: {
                'Origin': `${config.frontend.protocol}://${config.frontend.host}:${config.frontend.port}`,
                'Access-Control-Request-Method': 'GET'
            },
            timeout: 5000
        });
        
        const corsEnabled = response.headers['access-control-allow-origin'] === '*' || 
                           response.headers['access-control-allow-origin']?.includes(config.frontend.host);
        
        addTestResult(
            'CORS跨域配置',
            corsEnabled,
            corsEnabled ? 'CORS配置正确' : 'CORS配置可能有问题',
            { 
                allowOrigin: response.headers['access-control-allow-origin'],
                allowMethods: response.headers['access-control-allow-methods']
            }
        );
        
    } catch (error) {
        addTestResult('CORS配置测试', false, `测试失败: ${error.message}`);
    }
}

// 生成测试报告
function generateReport() {
    log('\n📊 生成端到端测试报告...', colors.magenta);
    
    const report = {
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0
        },
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        },
        services: config,
        tests: testResults.details
    };
    
    // 保存报告
    const fs = require('fs');
    fs.writeFileSync('end-to-end-test-report.json', JSON.stringify(report, null, 2));
    
    return report;
}

// 主测试函数
async function runTests() {
    log('🚀 开始端到端系统测试...', colors.bright);
    log('测试范围: 前端、后端API、数据库、缓存、IPFS、区块链、集成', colors.cyan);
    
    const startTime = Date.now();
    
    // 运行所有测试
    await testFrontend();
    await testBackendAPI();
    await testDatabase();
    await testCache();
    await testIPFS();
    await testBlockchain();
    await testIntegration();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // 生成报告
    const report = generateReport();
    
    // 输出总结
    log('\n🎉 端到端测试完成!', colors.bright);
    log(`⏱️  测试耗时: ${duration}秒`, colors.cyan);
    log(`✅ 通过测试: ${report.summary.passed}/${report.summary.total} (${report.summary.successRate}%)`, colors.green);
    
    if (report.summary.failed > 0) {
        log(`❌ 失败测试: ${report.summary.failed}`, colors.red);
    }
    
    log(`📄 详细报告已保存到: end-to-end-test-report.json`, colors.yellow);
    
    // 返回测试结果
    return report.summary.failed === 0;
}

// 运行测试
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        log(`💥 测试执行失败: ${error.message}`, colors.red);
        process.exit(1);
    });
}

module.exports = { runTests, config };
