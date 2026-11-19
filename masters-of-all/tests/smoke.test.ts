import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { formatDepartmentCountText } from '../src/utils/numberToWords';

const ONE_BY_ONE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function jsonReq(
  baseUrl: string,
  endpoint: string,
  opts: {
    method?: string;
    token?: string;
    body?: unknown;
    ip?: string;
  } = {}
): Promise<{ status: number; headers: Headers; text: string; data: Record<string, unknown> | unknown[] | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-MoA-Request': '1'
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.ip) headers['X-Forwarded-For'] = opts.ip;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: opts.method || 'GET',
    headers,
    redirect: 'manual',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });

  const text = await res.text();
  let data: Record<string, unknown> | unknown[] | null = null;
  try {
    data = JSON.parse(text) as Record<string, unknown> | unknown[];
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, text, data };
}

async function rawReq(
  baseUrl: string,
  endpoint: string,
  opts: {
    method?: string;
    token?: string;
    contentType?: string;
    body?: Uint8Array | Buffer;
  } = {}
): Promise<{ status: number; headers: Headers; buffer: Buffer }> {
  const headers: Record<string, string> = {
    'X-MoA-Request': '1'
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.contentType) headers['Content-Type'] = opts.contentType;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: opts.method || 'GET',
    headers,
    redirect: 'manual',
    body: opts.body ? new Blob([new Uint8Array(opts.body)]) : undefined
  });
  const ab = await res.arrayBuffer();
  return { status: res.status, headers: res.headers, buffer: Buffer.from(ab) };
}

async function run() {
  const prodSqlitePath = path.resolve('data/moa.sqlite');
  const prodSqliteBefore = fs.existsSync(prodSqlitePath) ? fs.readFileSync(prodSqlitePath) : null;
  const prodJsonPath = path.resolve('data/database.json');
  const prodJsonBefore = fs.existsSync(prodJsonPath) ? fs.readFileSync(prodJsonPath, 'utf-8') : null;

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-smoke-'));
  const tmpDataDir = path.join(tmpRoot, 'data');
  const tmpUploadsDir = path.join(tmpRoot, 'uploads');
  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(tmpUploadsDir, { recursive: true });

  // Always prefer migrating/testing from existing database in temp dir without mutating prod
  if (prodJsonBefore !== null) {
    fs.writeFileSync(path.join(tmpDataDir, 'database.json'), prodJsonBefore, 'utf-8');
  } else if (prodSqliteBefore !== null) {
    fs.writeFileSync(path.join(tmpDataDir, 'moa.sqlite'), prodSqliteBefore);
  }

  // Clear SMTP env so invitation tests verify graceful no-SMTP fallback
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  process.env.MOA_DATA_DIR = tmpDataDir;
  process.env.MOA_UPLOADS_DIR = tmpUploadsDir;
  process.env.MOA_NO_LISTEN = '1';
  process.env.NODE_ENV = 'test';

  const [{ app }, { dbStore, reconcileTestAccounts }] = await Promise.all([
    import('../server'),
    import('../server/db/store')
  ]);

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log('1. Dynamic department count text formatting...');
    assert.equal(formatDepartmentCountText('The {{departmentCountWordCap}} {{disciplinesNoun}}', 1), 'The One Discipline');
    assert.equal(formatDepartmentCountText('The {{departmentCountWordCap}} {{disciplinesNoun}}', 7), 'The Seven Disciplines');
    assert.equal(formatDepartmentCountText('oversees the {{departmentCountWord}} {{departmentsNoun}}', 1), 'oversees the one department');
    assert.equal(formatDepartmentCountText('oversees the {{departmentCountWord}} {{departmentsNoun}}', 9), 'oversees the nine departments');

    console.log('2. SQLite single-database migration & record preservation...');
    assert.ok(fs.existsSync(path.join(tmpDataDir, 'moa.sqlite')), 'moa.sqlite must exist as single database');
    assert.ok(!fs.existsSync(path.join(tmpDataDir, 'database.json')), 'legacy database.json must be retired after migration');
    const dbInitial = dbStore.read();
    assert.ok(dbInitial.departments.length > 0, 'Existing departments preserved');
    assert.ok(dbInitial.users.length >= 2, 'Users + test accounts present');
    assert.ok(dbInitial.roles.some(r => r.id === 'role-admin') && dbInitial.roles.some(r => r.id === 'role-member'));

    console.log('3. Sensitive file routes return 404...');
    for (const p of ['/data/moa.sqlite', '/data/database.json', '/server.ts', '/package.json', '/.env']) {
      const r = await jsonReq(baseUrl, p);
      assert.equal(r.status, 404, `Expected 404 for ${p}, got ${r.status}`);
    }

    console.log('4. Health, content-version, and test accounts login...');
    const healthRes = await jsonReq(baseUrl, '/api/health');
    assert.equal(healthRes.status, 200);
    assert.equal((healthRes.data as { ok: boolean }).ok, true);

    const verStart = await jsonReq(baseUrl, '/api/content-version');
    const initialVersion = (verStart.data as { version: number }).version;
    assert.ok(typeof initialVersion === 'number' && initialVersion >= 1);

    const adminLogin = await jsonReq(baseUrl, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'admin@mastersofall.org', password: 'admin123' }
    });
    assert.equal(adminLogin.status, 200, 'Dev admin test account sign-in');
    const adminToken = (adminLogin.data as { token: string }).token;
    assert.ok(adminToken);

    const memberLogin = await jsonReq(baseUrl, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'solo@mastersofall.org', password: 'solo123' }
    });
    assert.equal(memberLogin.status, 200, 'Dev member test account sign-in');
    const memberToken = (memberLogin.data as { token: string }).token;
    assert.ok(memberToken);

    console.log('5. Member gets 403 on restricted routes...');
    for (const forbidden of [
      { path: '/api/settings', method: 'PUT', body: { siteName: 'Hack' } },
      { path: '/api/members', method: 'GET' },
      { path: '/api/submissions', method: 'GET' },
      { path: '/api/backup/export', method: 'GET' },
      { path: '/api/page-content', method: 'PUT', body: {} },
      { path: '/api/pages', method: 'POST', body: { title: 'Test' } }
    ]) {
      const res = await jsonReq(baseUrl, forbidden.path, {
        method: forbidden.method,
        token: memberToken,
        body: forbidden.body
      });
      assert.equal(res.status, 403, `Expected 403 on ${forbidden.method} ${forbidden.path}, got ${res.status}`);
    }

    console.log('6. Live role permission toggles take effect immediately...');
    const roleBefore = dbStore.read().roles.find(r => r.id === 'role-member')!;
    const origPerms = [...roleBefore.permissions];
    const grantRes = await jsonReq(baseUrl, '/api/roles/role-member', {
      method: 'PUT',
      token: adminToken,
      body: { permissions: [...origPerms, 'pages.manage'] }
    });
    assert.equal(grantRes.status, 200);

    const createPageAllowed = await jsonReq(baseUrl, '/api/pages', {
      method: 'POST',
      token: memberToken,
      body: { title: 'Smoke Role Page', slug: 'smoke-role-page', template: 'Standard', status: 'Draft', blocks: [], seo: {} }
    });
    assert.ok([200, 201].includes(createPageAllowed.status), `Member should be allowed to create page once pages.manage is toggled ON (got ${createPageAllowed.status})`);
    const createdPageId = (createPageAllowed.data as { id: string }).id;

    // Toggle permission OFF and confirm immediate 403
    const revokeRes = await jsonReq(baseUrl, '/api/roles/role-member', {
      method: 'PUT',
      token: adminToken,
      body: { permissions: origPerms }
    });
    assert.equal(revokeRes.status, 200);

    const deletePageDenied = await jsonReq(baseUrl, `/api/pages/${createdPageId}`, {
      method: 'DELETE',
      token: memberToken
    });
    assert.equal(deletePageDenied.status, 403, 'Member must be denied immediately once pages.manage is toggled OFF');
    await jsonReq(baseUrl, `/api/pages/${createdPageId}`, { method: 'DELETE', token: adminToken });

    console.log('7. Review flow & public visibility for Publications and Products...');
    const pubCreate = await jsonReq(baseUrl, '/api/publications', {
      method: 'POST',
      token: memberToken,
      body: {
        title: 'Smoke Research Monograph',
        authors: 'Asel Syed',
        abstract: 'Verification study.',
        publicationDate: '2026-11-14',
        publicationType: 'Monograph',
        publicationStatus: 'Published', // Member lacks projects.publish -> forced Pending Review
        pdfUrl: 'https://example.org/paper.pdf'
      }
    });
    assert.ok([200, 201].includes(pubCreate.status), `Expected 200/201 for pubCreate, got ${pubCreate.status}`);
    const createdPub = pubCreate.data as { id: string; publicationStatus: string };
    assert.equal(createdPub.publicationStatus, 'Pending Review');

    // Member lacks products.manage by default -> 403
    const prodDenied = await jsonReq(baseUrl, '/api/products', {
      method: 'POST',
      token: memberToken,
      body: { name: 'Denied Product' }
    });
    assert.equal(prodDenied.status, 403, 'Member should receive 403 on POST /api/products by default');

    // Temporarily grant products.manage to Member, create Pending Review product, then restore perms
    const prodRoleBefore = dbStore.read().roles.find(r => r.id === 'role-member')!;
    const prodOrigPerms = [...prodRoleBefore.permissions];
    await jsonReq(baseUrl, '/api/roles/role-member', {
      method: 'PUT',
      token: adminToken,
      body: { permissions: [...prodOrigPerms, 'products.manage'] }
    });

    const prodCreate = await jsonReq(baseUrl, '/api/products', {
      method: 'POST',
      token: memberToken,
      body: {
        name: 'Smoke Analytical Tool',
        tagline: 'Verification toolkit',
        category: 'Software',
        status: 'Released',
        publicationStatus: 'Published', // Forced Pending Review
        shortDescription: 'Tool summary',
        availabilityPricing: 'free'
      }
    });
    assert.ok([200, 201].includes(prodCreate.status), `Expected 200/201 for prodCreate, got ${prodCreate.status}`);
    const createdProd = prodCreate.data as { id: string; slug: string; publicationStatus: string };
    assert.equal(createdProd.publicationStatus, 'Pending Review');

    await jsonReq(baseUrl, '/api/roles/role-member', {
      method: 'PUT',
      token: adminToken,
      body: { permissions: prodOrigPerms }
    });

    // Approve both as Admin
    const pubApprove = await jsonReq(baseUrl, `/api/publications/${createdPub.id}/review`, {
      method: 'POST',
      token: adminToken,
      body: { action: 'approved', comment: 'Approved in smoke test' }
    });
    assert.equal(pubApprove.status, 200);

    const prodApprove = await jsonReq(baseUrl, `/api/products/${createdProd.id}/review`, {
      method: 'POST',
      token: adminToken,
      body: { action: 'approved', comment: 'Approved in smoke test' }
    });
    assert.equal(prodApprove.status, 200);

    const publicPubs = await jsonReq(baseUrl, '/api/publications');
    assert.ok((publicPubs.data as Array<{ id: string }>).some(p => p.id === createdPub.id));
    const publicProds = await jsonReq(baseUrl, '/api/products');
    assert.ok((publicProds.data as Array<{ id: string }>).some(p => p.id === createdProd.id));
    const prodBySlug = await jsonReq(baseUrl, `/api/products/by-slug/${createdProd.slug}`);
    assert.equal(prodBySlug.status, 200);

    const limitsRes = await jsonReq(baseUrl, '/api/media/limits', { token: adminToken });
    assert.equal(limitsRes.status, 200);
    assert.ok(typeof (limitsRes.data as { image?: number }).image === 'number');
    assert.ok(typeof (limitsRes.data as { document?: number }).document === 'number');

    console.log('8. Data Integrity: publish -> search/sitemap -> delete -> 404 -> restart -> empty trash -> restart...');
    const existingSector = dbInitial.departments.find(d => d.kind === 'sector');
    const projCreate = await jsonReq(baseUrl, '/api/projects', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Integrity Smoke Project',
        slug: 'integrity-smoke-project',
        shortDescription: 'End to end persistence check',
        fullDescription: 'Detailed integrity verification project.',
        sectorIds: existingSector ? [existingSector.id] : [],
        category: 'Technology',
        status: 'Active',
        publicationStatus: 'Published'
      }
    });
    assert.ok([200, 201].includes(projCreate.status), `Expected 200/201 for projCreate, got ${projCreate.status}`);
    const createdProj = projCreate.data as { id: string; slug: string; sectorIds?: string[] };
    if (existingSector) {
      assert.ok(createdProj.sectorIds?.includes(existingSector.id), 'Project should persist sectorIds');
    }

    // Rename slug -> auto-redirect created + 301 works
    const renameProj = await jsonReq(baseUrl, `/api/projects/${createdProj.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { slug: 'integrity-smoke-renamed' }
    });
    assert.equal(renameProj.status, 200);

    const redirTest = await jsonReq(baseUrl, '/api/redirects/test', {
      method: 'POST',
      token: adminToken,
      body: { path: '/projects/integrity-smoke-project' }
    });
    assert.equal(redirTest.status, 200);
    assert.equal((redirTest.data as { matched: boolean; finalPath: string }).matched, true);
    assert.equal((redirTest.data as { matched: boolean; finalPath: string }).finalPath, '/projects/integrity-smoke-renamed');

    const httpRedir = await jsonReq(baseUrl, '/projects/integrity-smoke-project');
    assert.equal(httpRedir.status, 301);
    assert.equal(httpRedir.headers.get('location'), '/projects/integrity-smoke-renamed');

    // Circular redirect loop rejected
    const loopRes = await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: {
        redirects: [
          { id: 'r1', from: '/loop-a', to: '/loop-b', type: '301' },
          { id: 'r2', from: '/loop-b', to: '/loop-a', type: '301' }
        ]
      }
    });
    assert.equal(loopRes.status, 400);

    // Public list + detail + sitemap show published project
    const pubListHit = await jsonReq(baseUrl, '/api/projects');
    assert.ok((pubListHit.data as Array<{ id: string }>).some(p => p.id === createdProj.id));
    const detailOk = await jsonReq(baseUrl, '/api/projects/by-slug/integrity-smoke-renamed');
    assert.equal(detailOk.status, 200);
    const sitemap1 = await jsonReq(baseUrl, '/sitemap.xml');
    assert.ok(sitemap1.text.includes('/projects/integrity-smoke-renamed'));

    // Soft-delete project
    const delProj = await jsonReq(baseUrl, `/api/projects/${createdProj.id}`, {
      method: 'DELETE',
      token: adminToken
    });
    assert.equal(delProj.status, 200);

    const publicProjsAfterDelete = await jsonReq(baseUrl, '/api/projects');
    assert.ok(!(publicProjsAfterDelete.data as Array<{ id: string }>).some(p => p.id === createdProj.id));
    const detail404 = await jsonReq(baseUrl, '/api/projects/by-slug/integrity-smoke-renamed');
    assert.equal(detail404.status, 404);
    const sitemapAfterDelete = await jsonReq(baseUrl, '/sitemap.xml');
    assert.equal(sitemapAfterDelete.text.includes('/projects/integrity-smoke-renamed'), false);

    // Simulated server restart before emptying trash -> still gone from public and still in trash
    dbStore.reloadFromDisk();
    const trashBeforeEmpty = await jsonReq(baseUrl, '/api/trash', { token: adminToken });
    assert.ok((trashBeforeEmpty.data as { projects: Array<{ id: string }> }).projects.some(p => p.id === createdProj.id));
    const publicAfterRestart1 = await jsonReq(baseUrl, '/api/projects');
    assert.ok(!(publicAfterRestart1.data as Array<{ id: string }>).some(p => p.id === createdProj.id));

    // Empty trash -> reloadFromDisk -> remains empty
    const emptyTrashRes = await jsonReq(baseUrl, '/api/trash/empty', {
      method: 'DELETE',
      token: adminToken
    });
    assert.equal(emptyTrashRes.status, 200);
    dbStore.reloadFromDisk();
    const trashAfterRestart = await jsonReq(baseUrl, '/api/trash', { token: adminToken });
    assert.equal((trashAfterRestart.data as { projects: unknown[] }).projects.length, 0);

    // Content version counter incremented
    const verEnd = await jsonReq(baseUrl, '/api/content-version');
    assert.ok((verEnd.data as { version: number }).version > initialVersion, 'content-version counter incremented');

    console.log('9. Department delete with project reassignment...');
    const deptA = (await jsonReq(baseUrl, '/api/departments', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Temp Dept A', slug: 'temp-dept-a', published: true }
    })).data as { id: string };
    const deptB = (await jsonReq(baseUrl, '/api/departments', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Temp Dept B', slug: 'temp-dept-b', published: true }
    })).data as { id: string };
    const linkedProj = (await jsonReq(baseUrl, '/api/projects', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Dept Reassign Project',
        departmentIds: [deptA.id],
        primaryDepartmentId: deptA.id,
        publicationStatus: 'Draft'
      }
    })).data as { id: string };
    const delDeptA = await jsonReq(baseUrl, `/api/departments/${deptA.id}`, {
      method: 'DELETE',
      token: adminToken,
      body: { projectHandling: 'reassign', targetDeptId: deptB.id }
    });
    assert.equal(delDeptA.status, 200);
    const reloadedProj = dbStore.read().projects.find(p => p.id === linkedProj.id)!;
    assert.ok(reloadedProj.departmentIds.includes(deptB.id) && !reloadedProj.departmentIds.includes(deptA.id));

    console.log('10. Upload validation (reject SVG & spoofed PNG bytes, allow valid PNG)...');
    const svgUpload = await jsonReq(baseUrl, '/api/media', {
      method: 'POST',
      token: adminToken,
      body: { name: 'evil.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', altText: 'svg' }
    });
    assert.equal(svgUpload.status, 400);

    const spoofUpload = await jsonReq(baseUrl, '/api/media', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'spoof.png',
        dataUrl: `data:image/png;base64,${Buffer.from('not a real png').toString('base64')}`,
        altText: 'spoof'
      }
    });
    assert.equal(spoofUpload.status, 400);

    const goodUpload = await jsonReq(baseUrl, '/api/media', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'pixel.png',
        dataUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
        altText: 'Valid 1x1 pixel'
      }
    });
    assert.ok([200, 201].includes(goodUpload.status), `Expected 200/201 for goodUpload, got ${goodUpload.status}`);
    const uploadedAsset = goodUpload.data as { id: string; url: string };
    assert.ok(uploadedAsset.url.startsWith('/uploads/'));
    const uploadedFilename = path.basename(uploadedAsset.url.split('?')[0]);
    assert.equal(
      fs.existsSync(path.join(tmpUploadsDir, uploadedFilename)),
      false,
      'Uploaded binary must be stored in SQLite media_blobs instead of loose disk files'
    );

    const servedBlob = await rawReq(baseUrl, uploadedAsset.url);
    assert.equal(servedBlob.status, 200, 'GET /uploads/:filename must serve uploaded binary from SQLite');
    assert.equal(servedBlob.headers.get('content-type'), 'image/png');
    assert.ok(servedBlob.buffer.equals(Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64')));

    // Attach uploaded logo to deptB and verify persistence across DB reload
    const deptLogoUpd = await jsonReq(baseUrl, `/api/departments/${deptB.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { customLogoUrl: uploadedAsset.url }
    });
    assert.equal(deptLogoUpd.status, 200);
    dbStore.reloadFromDisk();
    const reloadedDeptB = dbStore.read().departments.find(d => d.id === deptB.id);
    assert.equal(reloadedDeptB?.customLogoUrl, uploadedAsset.url, 'Department customLogoUrl must persist in SQLite');

    console.log('11. Public routes remain live & ignore legacy maintenanceMode payloads...');
    await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: { alwaysShowProducts: false }
    });
    const publicProjectsRes = await jsonReq(baseUrl, '/api/projects');
    assert.equal(publicProjectsRes.status, 200);
    const adminProjectsRes = await jsonReq(baseUrl, '/api/projects/admin', { token: adminToken });
    assert.equal(adminProjectsRes.status, 200);

    console.log('12. SQLite snapshot export/import omits sensitive tables, preserves media_blobs, and rejects JSON...');
    const backupRes = await rawReq(baseUrl, '/api/backup/export', { token: adminToken });
    assert.equal(backupRes.status, 200);
    assert.ok(
      (backupRes.headers.get('content-type') || '').includes('application/x-sqlite3'),
      'Backup export must return application/x-sqlite3'
    );
    assert.equal(
      backupRes.buffer.subarray(0, 16).toString('utf8'),
      'SQLite format 3\0',
      'Backup export must have SQLite format 3 magic header'
    );
    const exportedSqlitePath = path.join(tmpRoot, 'exported-snapshot.sqlite');
    fs.writeFileSync(exportedSqlitePath, backupRes.buffer);
    const snapDb = new DatabaseSync(exportedSqlitePath, { readOnly: true });
    try {
      const tableNames = (
        snapDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
      ).map(r => r.name);
      assert.ok(tableNames.includes('app_meta'), 'Snapshot must include app_meta');
      assert.ok(tableNames.includes('departments'), 'Snapshot must include departments');
      assert.ok(tableNames.includes('media_blobs'), 'Snapshot must include media_blobs');
      const blobRow = snapDb
        .prepare('SELECT filename FROM media_blobs WHERE filename = ?')
        .get(uploadedFilename) as { filename: string } | undefined;
      assert.equal(blobRow?.filename, uploadedFilename, 'Exported SQLite snapshot must contain uploaded media binary');
      for (const forbidden of ['users', 'user_credentials', 'sessions', 'password_resets', 'security_log']) {
        assert.equal(tableNames.includes(forbidden), false, `Snapshot must omit ${forbidden}`);
      }
      const rawText = backupRes.buffer.toString('utf8');
      assert.equal(rawText.includes('passwordHash'), false);
      assert.equal(rawText.includes('twoFactorSecret'), false);
      assert.equal(rawText.includes('recoveryCodes'), false);
    } finally {
      snapDb.close();
    }

    const jsonRejectRes = await jsonReq(baseUrl, '/api/backup/import', {
      method: 'POST',
      token: adminToken,
      body: { version: '1.0', departments: [] }
    });
    assert.equal(jsonRejectRes.status, 400, 'JSON payload must be rejected by /api/backup/import');

    // Wipe uploaded blob from live SQLite, restore snapshot, and verify binary & logo return
    const liveDbForBlobTest = new DatabaseSync(path.join(tmpDataDir, 'moa.sqlite'));
    liveDbForBlobTest.prepare('DELETE FROM media_blobs WHERE filename = ?').run(uploadedFilename);
    liveDbForBlobTest.close();
    const missingAfterWipe = await rawReq(baseUrl, uploadedAsset.url);
    assert.equal(missingAfterWipe.status, 404);

    const sqliteRestoreRes = await rawReq(baseUrl, '/api/backup/import', {
      method: 'POST',
      token: adminToken,
      contentType: 'application/x-sqlite3',
      body: backupRes.buffer
    });
    assert.equal(sqliteRestoreRes.status, 200, 'Valid SQLite snapshot must restore cleanly');

    const restoredBlob = await rawReq(baseUrl, uploadedAsset.url);
    assert.equal(restoredBlob.status, 200, 'Uploaded image must be served again after SQLite snapshot restore');
    assert.ok(restoredBlob.buffer.equals(Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64')));

    console.log('13. Contact submissions, honeypot, and read-only enforcement (no replied)...');
    const honeypotSub = await jsonReq(baseUrl, '/api/submissions', {
      method: 'POST',
      body: { name: 'Bot', email: 'bot@spam.example', message: 'buy now', website: 'http://spam.example' }
    });
    assert.equal(honeypotSub.status, 200);
    const validSub = await jsonReq(baseUrl, '/api/submissions', {
      method: 'POST',
      body: { name: 'Ada Lovelace', email: 'ada@example.org', subject: 'Collab', message: 'Hello MoA!' }
    });
    assert.equal(validSub.status, 200);
    const subsList = await jsonReq(baseUrl, '/api/submissions?page=1&limit=10&status=new', { token: adminToken });
    const items = (subsList.data as { items: Array<{ id: string; email: string }> }).items;
    const adaSub = items.find(s => s.email === 'ada@example.org');
    assert.ok(adaSub);
    assert.equal(items.some(s => s.email === 'bot@spam.example'), false);

    const repliedRejected = await jsonReq(baseUrl, `/api/submissions/${adaSub.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'replied' }
    });
    assert.equal(repliedRejected.status, 400);

    const readOk = await jsonReq(baseUrl, `/api/submissions/${adaSub.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'read' }
    });
    assert.equal(readOk.status, 200);

    console.log('14. Invitation graceful no-SMTP fallback...');
    const invCreate = await jsonReq(baseUrl, '/api/invitations', {
      method: 'POST',
      token: adminToken,
      body: { email: 'invitee@example.org', name: 'New Researcher', roleId: 'role-member' }
    });
    assert.ok([200, 201].includes(invCreate.status), `Expected 200/201 for invCreate, got ${invCreate.status}`);
    const invData = invCreate.data as {
      id: string;
      smtpConfigured: boolean;
      emailSent: boolean;
      inviteUrl: string;
    };
    assert.equal(invData.smtpConfigured, false);
    assert.equal(invData.emailSent, false);
    assert.ok(invData.inviteUrl.includes('/invite?token='));

    console.log('15. Brute-force lockout on distinct IP & production deactivation of test accounts...');
    for (let i = 0; i < 6; i++) {
      await jsonReq(baseUrl, '/api/auth/signin', {
        method: 'POST',
        ip: '203.0.113.77',
        body: { email: 'nonexistent@mastersofall.org', password: 'wrongpassword' }
      });
    }
    const lockedRes = await jsonReq(baseUrl, '/api/auth/signin', {
      method: 'POST',
      ip: '203.0.113.77',
      body: { email: 'nonexistent@mastersofall.org', password: 'wrongpassword' }
    });
    assert.equal(lockedRes.status, 429);

    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_TEST_ACCOUNTS;
    reconcileTestAccounts(dbStore.read());
    const prodFounder = dbStore.read().users.find(u => u.email === 'admin@mastersofall.org');
    const prodRemovedTestAdmin = dbStore.read().users.find(u => u.id === 'usr-test-admin');
    const prodMemberTest = dbStore.read().users.find(u => u.email === 'solo@mastersofall.org');
    assert.equal(prodRemovedTestAdmin, undefined, 'separate Test Admin account must not exist');
    assert.equal(prodFounder?.name, 'Muslim Mehdi', 'founder Muslim Mehdi must remain active with admin email');
    assert.equal(prodFounder?.deactivated, false, 'founder Muslim Mehdi must stay active in production');
    assert.equal(prodMemberTest?.deactivated, true, 'member test account must deactivate in production');

    // Ensure production DB files were never touched
    if (prodSqliteBefore !== null) {
      assert.ok(fs.readFileSync(prodSqlitePath).equals(prodSqliteBefore), 'Production moa.sqlite must remain untouched');
    }
    if (prodJsonBefore !== null) {
      assert.equal(fs.readFileSync(prodJsonPath, 'utf-8'), prodJsonBefore, 'Production database.json must remain untouched during isolated tests');
    }

    console.log('16. Updating/clearing existing records, Live Editor draft/publish persistence & retired JSON backups...');
    // Re-enable test accounts context in NODE_ENV=test so admin session remains valid
    process.env.NODE_ENV = 'test';
    const updProjCreate = await jsonReq(baseUrl, '/api/projects', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Editable Project',
        slug: 'editable-project',
        shortDescription: 'Initial summary',
        fullDescription: 'Initial full text',
        category: 'Research',
        status: 'Active',
        publicationStatus: 'Published',
        seoShareImage: 'https://example.org/share.png',
        primaryDepartmentId: deptB.id,
        departmentIds: [deptB.id]
      }
    });
    assert.ok([200, 201].includes(updProjCreate.status));
    const updProjId = (updProjCreate.data as { id: string }).id;

    // Update with null / empty strings to ensure no "null" coercion errors or 400/500 failures
    const updProjRes = await jsonReq(baseUrl, `/api/projects/${updProjId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        title: 'Editable Project Updated',
        shortDescription: '',
        seoShareImage: '',
        primaryDepartmentId: null,
        videoUrl: null,
        pdfUrl: ''
      }
    });
    assert.equal(updProjRes.status, 200, `Expected 200 updating project, got ${updProjRes.status}: ${updProjRes.text}`);
    const updProjData = updProjRes.data as {
      title: string;
      shortDescription?: string;
      seoShareImage?: string;
      primaryDepartmentId?: string | null;
    };
    assert.equal(updProjData.title, 'Editable Project Updated');
    assert.equal(updProjData.shortDescription, '');
    assert.equal(updProjData.seoShareImage, '');
    assert.ok(!updProjData.primaryDepartmentId, 'primaryDepartmentId should be cleared');

    // Update & clear optional fields on Product
    const updProdRes = await jsonReq(baseUrl, `/api/products/${createdProd.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        name: 'Smoke Analytical Tool v2',
        version: '',
        priceText: '',
        demoVideoUrl: null,
        links: { download: '', website: 'https://example.org/tool', repository: '', documentationPdf: '' },
        specs: [{ label: 'License', value: 'MIT' }]
      }
    });
    assert.equal(updProdRes.status, 200, `Expected 200 updating product, got ${updProdRes.status}: ${updProdRes.text}`);
    const updProdData = updProdRes.data as { name: string; version?: string; specs?: Array<{ label: string; value: string }> };
    assert.equal(updProdData.name, 'Smoke Analytical Tool v2');
    assert.equal(updProdData.version, '');
    assert.equal(updProdData.specs?.[0]?.label, 'License');

    // Update & clear optional fields on Publication
    const updPubRes = await jsonReq(baseUrl, `/api/publications/${createdPub.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        title: 'Smoke Research Monograph Rev 2',
        doiOrUrl: '',
        thumbnailUrl: null
      }
    });
    assert.equal(updPubRes.status, 200, `Expected 200 updating publication, got ${updPubRes.status}: ${updPubRes.text}`);
    assert.equal((updPubRes.data as { title: string }).title, 'Smoke Research Monograph Rev 2');

    // Update floating announcement widget settings and clear optional link fields
    const annRes = await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: {
        announcementBar: {
          enabled: true,
          message: 'Floating widget active',
          linkUrl: '',
          linkLabel: '',
          expiresAt: '',
          bgColor: '#17A491',
          textColor: '#031D1C',
          dismissible: true
        }
      }
    });
    assert.equal(annRes.status, 200, `Expected 200 updating announcement widget settings, got ${annRes.status}`);

    // Live Editor draft save & publish persistence (including newly added SiteContent keys)
    const currentLive = (await jsonReq(baseUrl, '/api/page-content')).data as Record<string, Record<string, string>>;
    const updatedDraft = {
      ...currentLive,
      work: {
        ...(currentLive.work || {}),
        allTabLabel: 'Everything',
        clearFiltersLabel: 'Reset all filters'
      },
      footer: {
        ...(currentLive.footer || {}),
        exploreHeading: 'Navigate'
      }
    };
    const saveDraftRes = await jsonReq(baseUrl, '/api/page-content/draft', {
      method: 'POST',
      token: adminToken,
      body: { draft: updatedDraft }
    });
    assert.equal(saveDraftRes.status, 200, `Expected 200 saving live editor draft, got ${saveDraftRes.status}`);

    dbStore.reloadFromDisk();
    const readDraftRes = await jsonReq(baseUrl, '/api/page-content/draft', { token: adminToken });
    assert.equal(readDraftRes.status, 200);
    const persistedDraft = (readDraftRes.data as { draft?: typeof updatedDraft }).draft;
    assert.equal(persistedDraft?.work?.allTabLabel, 'Everything');
    assert.equal(persistedDraft?.footer?.exploreHeading, 'Navigate');

    const publishDraftRes = await jsonReq(baseUrl, '/api/page-content/publish-draft', {
      method: 'POST',
      token: adminToken
    });
    assert.equal(publishDraftRes.status, 200);

    const publicAfterPublish = (await jsonReq(baseUrl, '/api/page-content')).data as typeof updatedDraft;
    assert.equal(publicAfterPublish.work?.allTabLabel, 'Everything');
    assert.equal(publicAfterPublish.work?.clearFiltersLabel, 'Reset all filters');
    assert.equal(publicAfterPublish.footer?.exploreHeading, 'Navigate');

    // Retired rolling JSON backup routes must not return 200
    const retiredListRes = await jsonReq(baseUrl, '/api/backup/list', { token: adminToken });
    assert.notEqual(retiredListRes.status, 200, 'Retired /api/backup/list must not return 200');

    console.log('17. Freedom Unit purged & multi-department child sectors work end-to-end...');
    const pubDataRes = await jsonReq(baseUrl, '/api/departments');
    assert.equal(pubDataRes.status, 200);
    const pubDepts = pubDataRes.data as Array<{ id: string; name: string; slug: string }>;
    assert.equal(
      pubDepts.some(d => d.id === 'dept-freedom' || d.slug === 'freedom-unit' || d.name.toLowerCase() === 'freedom unit'),
      false,
      'Freedom Unit must be completely removed from public departments'
    );

    const customDeptRes = await jsonReq(baseUrl, '/api/departments', {
      method: 'POST',
      token: adminToken,
      body: { name: 'MoA Labs', slug: 'moa-labs', kind: 'department', published: true, showInTree: true }
    });
    assert.ok([200, 201].includes(customDeptRes.status), `Expected 200/201 creating MoA Labs, got ${customDeptRes.status}`);
    const moaLabs = customDeptRes.data as { id: string; slug: string };

    const customSectorRes = await jsonReq(baseUrl, '/api/departments', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Quantum Systems',
        slug: 'quantum-systems',
        kind: 'sector',
        parentDepartmentId: moaLabs.id,
        published: true,
        showInTree: true
      }
    });
    assert.ok([200, 201].includes(customSectorRes.status), `Expected 200/201 creating custom sector, got ${customSectorRes.status}`);
    const qSector = customSectorRes.data as { id: string; slug: string; parentDepartmentId?: string };
    assert.equal(qSector.parentDepartmentId, moaLabs.id);

    const sitemapCustom = await jsonReq(baseUrl, '/sitemap.xml');
    assert.ok(
      sitemapCustom.text.includes('/departments/moa-labs/quantum-systems'),
      'Sitemap must route custom sector under /departments/moa-labs/quantum-systems'
    );

    const delCustomDept = await jsonReq(baseUrl, `/api/departments/${moaLabs.id}`, {
      method: 'DELETE',
      token: adminToken,
      body: { projectHandling: 'leave' }
    });
    assert.equal(delCustomDept.status, 200);
    const trashCustom = await jsonReq(baseUrl, '/api/trash', { token: adminToken });
    const trashedDepts = (trashCustom.data as { departments: Array<{ id: string }> }).departments;
    assert.ok(trashedDepts.some(d => d.id === moaLabs.id), 'Deleted parent department should be in Trash');
    assert.ok(trashedDepts.some(d => d.id === qSector.id), 'Child sector should move to Trash with parent department');

    console.log('18. Founder-only email/password & member reset restrictions...');
    // Disable enforce2FAForAdmins in test settings so the non-founder admin reaches route-level founder checks cleanly
    const disable2FAEnforce = await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: { securityPolicy: { ...dbStore.read().settings.securityPolicy, enforce2FAForAdmins: false } }
    });
    assert.equal(disable2FAEnforce.status, 200);

    const createNonFounderAdminRes = await jsonReq(baseUrl, '/api/members', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Co Admin',
        email: 'coadmin@example.org',
        temporaryPassword: 'CoAdminPass!123',
        roleId: 'role-admin'
      }
    });
    assert.ok(
      [200, 201].includes(createNonFounderAdminRes.status),
      `Expected 200/201 creating non-founder admin, got ${createNonFounderAdminRes.status}: ${createNonFounderAdminRes.text}`
    );
    const coAdminId = (createNonFounderAdminRes.data as { id: string }).id;

    // Clear mustChangePassword via founder update so Co Admin represents an established non-founder admin
    const founderFinalizeCoAdmin = await jsonReq(baseUrl, `/api/members/${coAdminId}`, {
      method: 'PUT',
      token: adminToken,
      body: { password: 'CoAdminPass!123' }
    });
    assert.equal(founderFinalizeCoAdmin.status, 200);

    const coAdminLogin = await jsonReq(baseUrl, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'coadmin@example.org', password: 'CoAdminPass!123' }
    });
    assert.equal(coAdminLogin.status, 200);
    const coAdminToken = (coAdminLogin.data as { token: string }).token;

    const memberUser = dbStore.read().users.find(u => u.email === 'solo@mastersofall.org')!;
    const denySelfCred = await jsonReq(baseUrl, '/api/auth/update-credentials', {
      method: 'POST',
      token: coAdminToken,
      body: { currentPassword: 'CoAdminPass!123', newEmail: 'coadmin2@example.org' }
    });
    assert.equal(denySelfCred.status, 403, 'Non-founder admin must get 403 updating own email/password');
    assert.notEqual((denySelfCred.data as { code?: string })?.code, '2FA_SETUP_REQUIRED');

    const denyChangePwd = await jsonReq(baseUrl, '/api/auth/change-password', {
      method: 'POST',
      token: coAdminToken,
      body: { currentPassword: 'CoAdminPass!123', newPassword: 'AnotherPass!123' }
    });
    assert.equal(denyChangePwd.status, 403, 'Non-founder must get 403 changing password when not forced');
    assert.notEqual((denyChangePwd.data as { code?: string })?.code, '2FA_SETUP_REQUIRED');

    const denyMemberReset = await jsonReq(baseUrl, `/api/members/${memberUser.id}/reset-password`, {
      method: 'POST',
      token: coAdminToken
    });
    assert.equal(denyMemberReset.status, 403, 'Non-founder admin must get 403 resetting another member password');
    assert.notEqual((denyMemberReset.data as { code?: string })?.code, '2FA_SETUP_REQUIRED');

    const denyMemberEmailEdit = await jsonReq(baseUrl, `/api/members/${memberUser.id}`, {
      method: 'PUT',
      token: coAdminToken,
      body: { email: 'hacked-solo@example.org' }
    });
    assert.equal(denyMemberEmailEdit.status, 403, 'Non-founder admin must get 403 changing another member email');
    assert.notEqual((denyMemberEmailEdit.data as { code?: string })?.code, '2FA_SETUP_REQUIRED');

    const allowNonCredEdit = await jsonReq(baseUrl, `/api/members/${memberUser.id}`, {
      method: 'PUT',
      token: coAdminToken,
      body: { name: 'Solo Researcher Updated' }
    });
    assert.equal(allowNonCredEdit.status, 200, `Non-founder admin can still update non-credential member fields: ${allowNonCredEdit.text}`);

    const founderUpdatesCoAdmin = await jsonReq(baseUrl, `/api/members/${coAdminId}`, {
      method: 'PUT',
      token: adminToken,
      body: { email: 'coadmin-updated@example.org', password: 'NewFounderSet!456' }
    });
    assert.equal(founderUpdatesCoAdmin.status, 200, `Founder must be able to update member email/password, got ${founderUpdatesCoAdmin.text}`);

    const coAdminNewLogin = await jsonReq(baseUrl, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'coadmin-updated@example.org', password: 'NewFounderSet!456' }
    });
    assert.equal(coAdminNewLogin.status, 200, 'Member must be able to sign in with founder-updated email & password');

    console.log('ALL SMOKE & DATA INTEGRITY TESTS PASSED!');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

run().catch(err => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
