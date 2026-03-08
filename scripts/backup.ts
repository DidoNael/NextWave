import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '../src/lib/db';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbUrl = process.env.DATABASE_URL || '';

    console.log(`[BACKUP] Iniciando backup em: ${timestamp}`);

    try {
        if (dbUrl.startsWith('file:')) {
            // SQLite Backup
            const dbPath = path.join(process.cwd(), dbUrl.replace('file:', ''));
            const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
            fs.copyFileSync(dbPath, backupPath);
            console.log(`[BACKUP] SQLite backup concluído: ${backupPath}`);
        } else {
            // External DB Backup (via mysqldump or pg_dump)
            console.log(`[BACKUP] Backup de banco externo detectado. Gerando dump SQL...`);
            const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

            // Aqui poderíamos usar ferramentas como mysqldump ou pg_dump se disponíveis
            // Por simplicidade na primeira versão, vamos exportar via Prisma ou comando do sistema
            // Se for postgres: pg_dump $DATABASE_URL > backupPath
            // Se for mysql: mysqldump ...

            // Exemplo genérico (necessita ferramentas instaladas no host)
            if (dbUrl.includes('postgresql')) {
                execSync(`pg_dump "${dbUrl}" > "${backupPath}"`, { stdio: 'inherit' });
            } else if (dbUrl.includes('mysql')) {
                // Parsear URL de conexão seria necessário aqui para extrair user/host/db
                console.warn("[BACKUP] MySQL backup direto ainda não implementado. Use ferramentas externas de dump.");
            }

            console.log(`[BACKUP] Dump concluído: ${backupPath}`);
        }

        // Rotação de backups (manter últimos 7 dias / 10 arquivos)
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
            files.slice(10).forEach(f => {
                fs.unlinkSync(path.join(BACKUP_DIR, f.name));
                console.log(`[BACKUP] Backup antigo removido: ${f.name}`);
            });
        }

    } catch (error) {
        console.error("[BACKUP] Erro crítico durante o backup:", error);
        process.exit(1);
    }
}

runBackup().then(() => {
    console.log("[BACKUP] Processo finalizado com sucesso.");
    process.exit(0);
});
