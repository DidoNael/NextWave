import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  console.log('--- Iniciando Migração Remota: SQLite -> PostgreSQL ---');

  const jsonPath = path.join(process.cwd(), 'backups', 'clients_migration.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('ERRO: Arquivo backups/clients_migration.json não encontrado!');
    process.exit(1);
  }

  const clientsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Lidos ${clientsData.length} clientes do arquivo de migração.`);

  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' }
  });

  if (!admin) {
    console.error('ERRO: Nenhum usuário administrador encontrado na produção!');
    process.exit(1);
  }
  console.log(`Clientes serão vinculados ao administrador: ${admin.email} (ID: ${admin.id})`);

  let count = 0;
  let errors = 0;

  for (const client of clientsData) {
    try {
      const { id, userId, createdAt, updatedAt, ...cleanData } = client;

      await prisma.client.upsert({
        where: { registrationId: client.registrationId || -1 },
        update: {
          ...cleanData,
          userId: admin.id,
        },
        create: {
          ...cleanData,
          userId: admin.id,
          registrationId: client.registrationId || undefined
        }
      });
      count++;
      if (count % 20 === 0) console.log(`Progresso: ${count}/${clientsData.length}...`);
    } catch (err: any) {
      console.error(`Erro ao migrar cliente ${client.name}:`, err.message);
      errors++;
    }
  }

  console.log('--- Migração Concluída ---');
  console.log(`Sucesso: ${count}`);
  console.log(`Falhas : ${errors}`);
  
  await prisma.$disconnect();
}

migrate();
