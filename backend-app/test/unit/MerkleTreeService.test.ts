/**
 * MerkleTreeService 单元测试
 */
import { MerkleTreeService } from '../../src/services/MerkleTreeService';

describe('MerkleTreeService', () => {
  let service: MerkleTreeService;

  beforeEach(() => {
    service = new MerkleTreeService();
  });

  it('buildMerkleTree: 空数据应抛出错误', () => {
    expect(() => service.buildMerkleTree([])).toThrow('数据数组不能为空');
  });

  it('getMerkleRoot/verifyDataIntegrity: 根哈希应一致', () => {
    const data = ['a', 'b', 'c', 'd'];
    const root = service.getMerkleRoot(data);
    expect(typeof root).toBe('string');
    expect(root).toHaveLength(64);
    expect(service.verifyDataIntegrity(data, root)).toBe(true);
    expect(service.verifyDataIntegrity([...data, 'x'], root)).toBe(false);
  });

  it('generateMerkleProof/verifyMerkleProof: 应成功生成并验证证明', () => {
    const data = ['a', 'b', 'c', 'd', 'e']; // 奇数长度
    const root = service.getMerkleRoot(data);
    const target = 'c';
    const proofObj = service.generateMerkleProof(data, target);

    expect(proofObj.leaf).toHaveLength(64);
    expect(proofObj.proof.length).toBeGreaterThan(0);
    expect(service.verifyMerkleProof(proofObj.root, proofObj.leaf, proofObj.proof)).toBe(true);
  });

  it('generateMerkleProof: 目标不存在应抛出错误', () => {
    const data = ['a', 'b', 'c'];
    expect(() => service.generateMerkleProof(data, 'z')).toThrow('目标数据不存在于数据集中');
  });

  it('verifyMerkleProof: 无效证明项应返回 false', () => {
    const data = ['x', 'y'];
    const root = service.getMerkleRoot(data);
    const leaf = (service as any).hash('x');
    expect(service.verifyMerkleProof(root, leaf, ['Z:not-a-hex'] as any)).toBe(false);
    expect(service.verifyMerkleProof(root, leaf, ['not-a-hex'] as any)).toBe(false);
  });

  it('createVersionInfo/verifyVersionChain: 应构建有效的版本链', () => {
    const versions: any[] = [];
    const v1 = service.createVersionInfo([], 'cid1', 'u1');
    const v2 = service.createVersionInfo([v1], 'cid2', 'u1');
    const v3 = service.createVersionInfo([v1, v2], 'cid3', 'u2');

    versions.push(v1, v2, v3);
    expect(service.verifyVersionChain(versions)).toBe(true);

    // 破坏链
    versions[1] = { ...versions[1], hash: '0'.repeat(64) };
    expect(service.verifyVersionChain(versions)).toBe(false);
  });

  it('getVersionDiff: 应正确输出差异', () => {
    const v1 = service.createVersionInfo([], 'cid1', 'u1');
    const v2 = service.createVersionInfo([v1], 'cid2', 'u2');
    const diff = service.getVersionDiff(v1, v2);
    expect(diff.versionDiff).toBe(1);
    expect(typeof diff.timeDiff).toBe('number');
    expect(diff.cidChanged).toBe(true);
    expect(diff.creatorChanged).toBe(true);
    expect(diff.hashDiff.from).toBe(v1.hash);
    expect(diff.hashDiff.to).toBe(v2.hash);
  });

  it('createEmptyTree/getTreeDepth/getLeafCount: 应按预期工作', () => {
    const empty = service.createEmptyTree();
    expect(empty.hash).toHaveLength(64);
    expect(service.getTreeDepth(empty)).toBe(1);
    expect(service.getLeafCount(empty)).toBe(1);
  });
});
