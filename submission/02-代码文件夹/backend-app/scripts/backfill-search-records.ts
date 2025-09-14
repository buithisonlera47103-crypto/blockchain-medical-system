import { pool } from '../src/config/database-mysql';
import { SearchService } from '../src/services/SearchService';
import type { RowDataPacket } from 'mysql2/promise';

async function main(): Promise<void> {
  console.log('[backfill] starting backfill to search_records...');
  const db = pool;
  const search = new SearchService(db);

  try {
    await search.initialize();
  } catch (e) {
    console.warn('[backfill] SearchService initialize failed, will attempt to continue:', e instanceof Error ? e.message : String(e));
  }

  const sql = `
    SELECT mr.record_id, mr.title, mr.patient_id, mr.creator_id, mr.file_type, mr.content_hash,
           mr.created_at, mr.updated_at, im.cid
    FROM medical_records mr
    LEFT JOIN ipfs_metadata im ON im.record_id = mr.record_id
    ORDER BY mr.created_at ASC
  `;

  const [rows] = await db.query<RowDataPacket[]>(sql);
  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const recordId = String(row['record_id']);
    const title = String(row['title'] ?? '');
    const patientId = String(row['patient_id'] ?? '');
    const creatorId = String(row['creator_id'] ?? '');
    const fileType = String(row['file_type'] ?? 'OTHER');
    const contentHash = String(row['content_hash'] ?? '');
    const cid = row['cid'] ? String(row['cid']) : '';

    try {
      await search.indexDocument({
        id: recordId,
        title,
        content: [title, patientId, creatorId, fileType, contentHash, cid].filter(Boolean).join(' '),
        type: 'medical_record',
        metadata: {
          patientId,
          creatorId,
          status: 'ACTIVE',
          fileType,
          ipfsCid: cid || null,
          txId: null,
        },
      });
      success += 1;
      if (success % 50 === 0) {
        console.log(`[backfill] indexed ${success}/${rows.length}`);
      }
    } catch (e) {
      failed += 1;
      console.warn('[backfill] index failed for record', recordId, e instanceof Error ? e.message : String(e));
    }
  }

  console.log(`[backfill] done. success=${success}, failed=${failed}, total=${rows.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[backfill] fatal error:', e);
  process.exit(1);
});

