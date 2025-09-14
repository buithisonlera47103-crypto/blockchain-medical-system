import express from 'express';
import { Gateway, Wallets } from 'fabric-network';
import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// IPFS client
const ipfs = create({ url: 'http://localhost:5001' });

// Fabric network connection
async function connectToNetwork() {
  try {
    // Load connection profile
    const ccpPath = path.resolve(process.cwd(), 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check to see if we've already enrolled the user
    const identity = await wallet.get('admin');
    if (!identity) {
      console.log('An identity for the user "admin" does not exist in the wallet');
      console.log('Run the enrollAdmin.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get the network (channel) our contract is deployed to
    const network = await gateway.getNetwork('mychannel');

    return network;
  } catch (error) {
    console.error(`Failed to connect to network: ${error}`);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Simple Blockchain EMR API is running' });
});

app.get('/test', async (req, res) => {
  try {
    console.log('Testing network connection...');
    const network = await connectToNetwork();
    const contract = network.getContract('basic');

    // Try a simple query
    const result = await contract.evaluateTransaction('GetAllAssets');
    console.log('Query successful:', result.toString());

    res.json({
      success: true,
      message: 'Network connection successful',
      assets: JSON.parse(result.toString()),
    });
  } catch (error) {
    console.error(`Test failed: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/emr', async (req, res) => {
  try {
    const { patientId, record, color, size, owner, appraisedValue } = req.body;

    // Upload to IPFS
    console.log('Uploading record to IPFS...');
    const ipfsResult = await ipfs.add(JSON.stringify(record));
    const ipfsHash = ipfsResult.cid.toString();
    console.log('IPFS hash:', ipfsHash);

    // Connect to blockchain
    console.log('Connecting to blockchain...');
    const network = await connectToNetwork();
    const contract = network.getContract('basic');

    // Submit transaction
    console.log('Submitting transaction...');
    const result = await contract.submitTransaction(
      'CreateAsset',
      patientId,
      color,
      size.toString(),
      owner,
      appraisedValue.toString()
    );

    console.log('Transaction successful');
    res.json({
      success: true,
      message: 'EMR created successfully',
      assetId: patientId,
      ipfsHash: ipfsHash,
      transactionId: result.toString(),
    });
  } catch (error) {
    console.error(`EMR creation failed: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
