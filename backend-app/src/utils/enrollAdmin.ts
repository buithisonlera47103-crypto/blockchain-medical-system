import * as fs from 'fs';
import * as path from 'path';

import { Wallets, X509Identity } from 'fabric-network';

async function enrollAdmin(): Promise<void> {
  try {
    // 创建钱包实例
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // 检查admin身份是否已存在
    const adminExists = await wallet.get('admin');
    if (adminExists) {
      console.log('Admin identity already exists in the wallet');
      return;
    }

    // 读取管理员证书和私钥
    const credPath =
      '/home/enovocaohanwen/blockchain-project/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp';
    const certPath = path.join(credPath, 'signcerts', 'cert.pem');
    const keyPath = path.join(credPath, 'keystore');

    // 读取证书
    const cert = fs.readFileSync(certPath).toString();

    // 读取私钥（keystore目录中的第一个文件）
    const keyFiles = fs.readdirSync(keyPath);
    if (keyFiles.length === 0) {
      throw new Error('No private key found in keystore');
    }
    const firstKeyFile = keyFiles[0];
    if (!firstKeyFile) {
      throw new Error('No valid private key file found');
    }
    const privateKey = fs.readFileSync(path.join(keyPath, firstKeyFile)).toString();

    // 创建身份
    const identity: X509Identity = {
      credentials: {
        certificate: cert,
        privateKey,
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // 将身份添加到钱包
    await wallet.put('admin', identity);
    console.log('Successfully enrolled admin user and imported it into the wallet');
  } catch (error) {
    console.error(`Failed to enroll admin user: ${error}`);
    process.exit(1);
  }
}

void enrollAdmin();
