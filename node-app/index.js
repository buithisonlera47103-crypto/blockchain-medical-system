import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Gateway, Wallets } from 'fabric-network';
import fs from 'fs';
import { create } from 'ipfs-http-client';

// 启动应用的主函数
async function main() {
  // 1. 首先，完成所有需要 await 的异步初始化
  const ipfs = create({ url: 'http://host.docker.internal:5001' });

  const connectToNetwork = async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const gateway = new Gateway();

    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: false },
    });
    return gateway.getNetwork('mychannel');
  };

  // 2. 在所有客户端都初始化完毕后，再定义 Express 应用和路由
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('Blockchain EMR Backend Running');
  });

  app.get('/test', async (req, res) => {
    try {
      console.log('Testing network connection...');
      const network = await connectToNetwork();
      const contract = network.getContract('basic');
      console.log('Connected to network and contract successfully');

      // Try a simple query first
      const result = await contract.evaluateTransaction('GetAllAssets');
      console.log('Query result:', result.toString());

      res.json({
        success: true,
        message: 'Network connection successful',
        assets: JSON.parse(result.toString()),
      });
    } catch (error) {
      console.error(`[ERROR] /test: ${error}`);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/emr', async (req, res) => {
    try {
      const { patientId, record, color, size, owner, appraisedValue } = req.body;
      if (!patientId || !record || !color || !size || !owner || !appraisedValue) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      console.log('Starting IPFS upload...');
      const fileBuffer = Buffer.from(JSON.stringify(record));
      const result = await ipfs.add(fileBuffer);
      const cidString = result.cid.toString();
      console.log('IPFS upload successful, CID:', cidString);

      console.log('Connecting to Fabric network...');
      const network = await connectToNetwork();
      const contract = network.getContract('basic');
      console.log('Connected to network and contract');

      console.log('Submitting transaction to blockchain...');
      const txResult = await contract.submitTransaction(
        'CreateAsset',
        patientId,
        color,
        size.toString(),
        owner,
        appraisedValue.toString()
      );
      console.log('Transaction submitted successfully:', txResult.toString());

      res.json({
        success: true,
        message: `Asset ${patientId} created. EMR stored on IPFS with CID: ${cidString}`,
      });
    } catch (error) {
      console.error(`[ERROR] /emr: ${error}`);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. 最后，启动服务器监听
  app.listen(3002, () => console.log('Server running on port 3002'));
}

// 执行 main 函数来启动整个应用
main().catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
