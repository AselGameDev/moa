import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
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

async function run() {
  const prodDbPath = path.resolve('data/database.json');
  const prodDbBefore = fs.existsSync(prodDbPath) ? fs.readFileSync(prodDbPath, 'utf-8') : null;

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-smoke-'));
  const tmpDataDir = path.join(tmpRoot, 'data');
  const tmpUploadsDir = path.join(tmpRoot, 'uploads');
  fs.mkdirSync(tmpDataDir, { recursive: true });
  fs.mkdirSync(tmpUploadsDir, { recursive: true });

  if (prodDbBefore !== null) {
    fs.writeFileSync(path.join(tmpDataDir, 'database.json'), prodDbBefore, 'utf-8');
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

    console.log('2. Migration preserved existing database records...');
    const dbInitial = dbStore.read();
    assert.ok(dbInitial.departments.length > 0, 'Existing departments preserved');
    assert.ok(dbInitial.users.length >= 2, 'Users + test accounts present');
    assert.ok(dbInitial.roles.some(r => r.id === 'role-admin') && dbInitial.roles.some(r => r.id === 'role-member'));

    console.log('3. Sensitive file routes return 404...');
    for (const p of ['/data/database.json', '/server.ts', '/package.json', '/.env']) {
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

    console.log('8. Data Integrity: publish -> search/sitemap -> delete -> 404 -> restart -> empty trash -> restart...');
    const projCreate = await jsonReq(baseUrl, '/api/projects', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Integrity Smoke Project',
        slug: 'integrity-smoke-project',
        shortDescription: 'End to end persistence check',
        fullDescription: 'Detailed integrity verification project.',
        category: 'Technology',
        status: 'Active',
        publicationStatus: 'Published'
      }
    });
    assert.ok([200, 201].includes(projCreate.status), `Expected 200/201 for projCreate, got ${projCreate.status}`);
    const createdProj = projCreate.data as { id: string; slug: string };

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

    console.log('11. Maintenance Mode (503 for public, 200 for authenticated portal user)...');
    await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: { maintenanceMode: true }
    });
    const publicDuringMaint = await jsonReq(baseUrl, '/api/projects');
    assert.equal(publicDuringMaint.status, 503);
    assert.equal(publicDuringMaint.headers.get('retry-after'), '300');
    const adminDuringMaint = await jsonReq(baseUrl, '/api/projects/admin', { token: adminToken });
    assert.equal(adminDuringMaint.status, 200);
    await jsonReq(baseUrl, '/api/settings', {
      method: 'PUT',
      token: adminToken,
      body: { maintenanceMode: false }
    });

    console.log('12. Backup export omits sessions, hashes, salts, 2FA secrets...');
    const backupRes = await jsonReq(baseUrl, '/api/backup/export', { token: adminToken });
    assert.equal(backupRes.status, 200);
    const backupText = backupRes.text;
    assert.equal('sessions' in (backupRes.data as object), false);
    assert.equal(backupText.includes('passwordHash'), false);
    assert.equal(backupText.includes('twoFactorSecret'), false);
    assert.equal(backupText.includes('recoveryCodes'), false);

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

    // Ensure production database.json was never touched
    if (prodDbBefore !== null) {
      assert.equal(fs.readFileSync(prodDbPath, 'utf-8'), prodDbBefore, 'Production database.json must remain untouched');
    }

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
