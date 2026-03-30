/**
 * Script de backup do banco SQLite.
 * Copia o arquivo prod.db para data/backups/backup-YYYY-MM-DD_HH-MM-SS.db
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Resolver caminho do banco a partir de DATABASE_URL ou padrão
const dbUrl = process.env.DATABASE_URL || 'file:./data/prod.db';
let dbRelative = dbUrl.replace(/^file:/, '');
let dbPath = path.isAbsolute(dbRelative)
    ? dbRelative
    : path.join(ROOT, dbRelative);

if (!fs.existsSync(dbPath)) {
    // Tentar dentro da pasta prisma
    const alt = path.join(ROOT, 'prisma', path.basename(dbRelative));
    if (fs.existsSync(alt)) dbPath = alt;
}

if (!fs.existsSync(dbPath)) {
    console.error(`[BACKUP] Banco não encontrado: ${dbPath}`);
    process.exit(1);
}

const BACKUP_DIR = path.join(ROOT, 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const dest = path.join(BACKUP_DIR, `backup-${ts}.db`);

fs.copyFileSync(dbPath, dest);
console.log(`[BACKUP] Salvo em: ${dest}`);

// Manter apenas os 10 backups mais recentes
const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
    .sort()
    .reverse();

files.slice(10).forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`[BACKUP] Antigo removido: ${f}`);
});
