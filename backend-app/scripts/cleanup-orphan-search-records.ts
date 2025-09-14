import { pool } from '../src/config/database-mysql';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Cleanup orphan records in search_records that have no corresponding medical_records row.
 * Default is dry-run. Pass --apply to actually delete.
 */
async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`[cleanup] starting orphan cleanup (apply=${apply})`);

  const sqlList = `
    SELECT sr.id
    FROM search_records sr
    LEFT JOIN medical_records mr ON mr.record_id = sr.id
    WHERE mr.record_id IS NULL
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sqlList);
  const ids = rows.map(r => String(r['id']));
  console.log(`[cleanup] found ${ids.length} orphan records`);

  if (!apply || ids.length === 0) {
    console.log('[cleanup] dry-run complete');
    process.exit(0);
  }

  const placeholders = ids.map(() => '?').join(',');
  const delSql = `DELETE FROM search_records WHERE id IN (${placeholders})`;
  const [res] = await pool.execute(delSql, ids);
  console.log('[cleanup] deleted', (res as any).affectedRows, 'rows');
  process.exit(0);
}

main().catch((e) => {
  console.error('[cleanup] fatal error:', e);
  process.exit(1);
});

