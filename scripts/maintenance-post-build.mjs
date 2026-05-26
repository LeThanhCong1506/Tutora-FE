import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const maintenance = resolve(distDir, 'maintenance.html');
const index = resolve(distDir, 'index.html');

if (!existsSync(maintenance)) {
  console.error('[maintenance] dist/maintenance.html not found — skipping');
  process.exit(0);
}

copyFileSync(maintenance, index);
console.log('[maintenance] dist/index.html replaced with maintenance content');
