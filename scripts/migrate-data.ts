// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';

const prisma = new PrismaClient();
const sqlite = new Database(path.join(process.cwd(), 'backups', 'prod.db'));

function convertValue(key: string, value: any) {
  if (value === null) return null;

  // Converter Booleanos (SQLite armazena 0 ou 1)
  const booleanFields = [
    'twoFactorEnabled', 'notifyEmail', 'notifyPush', 'notifyDue', 
    'isActive', 'fromMe', 'allDay', 'enabled', 'isDefault', 
    'secure', 'isTrial'
  ];
  if (booleanFields.includes(key)) {
    return value === 1 || value === true || value === 'true';
  }

  // Converter Datas (SQLite pode armazenar como string ou timestamp)
  const dateFields = [
    'createdAt', 'updatedAt', 'timestamp', 'startDate', 'endDate', 
    'dueDate', 'paidAt', 'lastRun', 'nextRun', 'emitidaEm', 
    'canceladaEm', 'validUntil', 'lastCheck', 'issuedAt', 'expiresAt', 
    'lastValidAt', 'trialEndsAt', 'lastMessageAt', 'googleTokenExpiry'
  ];
  if (dateFields.includes(key)) {
    if (!value) return null;
    return new Date(value);
  }

  return value;
}

function processObject(obj: any) {
  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    newObj[key] = convertValue(key, value);
  }
  return newObj;
}

async function migrate() {
  console.log('🚀 Iniciando migração de dados adaptativa (SQLite -> PostgreSQL)...');

  try {
    // 1. Criar Organização Padrão
    console.log('- Criando Organização padrão...');
    const defaultOrg = await prisma.organization.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        id: 'default_org_id',
        name: 'Organização Padrão',
        slug: 'default',
        settings: '{}'
      }
    });

    // Ordem de Tabelas
    const tablesInOrder = [
      { name: 'UserGroup', model: prisma.userGroup },
      { name: 'Branch', model: prisma.branch },
      { name: 'User', model: prisma.user, extra: { organizationId: defaultOrg.id } },
      { name: 'Client', model: prisma.client },
      { name: 'Project', model: prisma.project },
      { name: 'TaskColumn', model: prisma.taskColumn },
      { name: 'Task', model: prisma.task },
      { name: 'Service', model: prisma.service, extra: { organizationId: defaultOrg.id } },
      { name: 'WhatsAppFlow', model: prisma.whatsAppFlow },
      { name: 'WhatsAppNode', model: prisma.whatsAppNode },
      { name: 'WhatsAppEdge', model: prisma.whatsAppEdge },
      { name: 'WhatsAppConfig', model: prisma.whatsAppConfig },
      { name: 'WhatsAppChannel', model: prisma.whatsAppChannel },
      { name: 'WhatsAppInteraction', model: prisma.whatsAppInteraction },
      { name: 'WhatsAppMessage', model: prisma.whatsAppMessage },
      { name: 'wa_messages', model: prisma.waMessage }, // Mapeado para WaMessage
      { name: 'SmtpConfig', model: prisma.smtpConfig },
      { name: 'SystemModule', model: prisma.systemModule },
      { name: 'SystemLicense', model: prisma.systemLicense },
      { name: 'SystemBranding', model: prisma.systemBranding },
      { name: 'PbxConfig', model: prisma.pbxConfig },
      { name: 'PaymentGatewayConfig', model: prisma.paymentGatewayConfig },
      { name: 'McpConfig', model: prisma.mcpConfig },
      { name: 'NfeConfig', model: prisma.nfeConfig },
      { name: 'NfseTipoServico', model: prisma.nfseTipoServico },
      { name: 'NfseRecord', model: prisma.nfseRecord },
      { name: 'ScheduledTask', model: prisma.scheduledTask },
      { name: 'Subscription', model: prisma.subscription },
      { name: 'Transaction', model: prisma.transaction },
      { name: 'Event', model: prisma.event },
      { name: 'CallLog', model: prisma.callLog },
      { name: 'ClientAttachment', model: prisma.clientAttachment },
    ];

    for (const tableConfig of tablesInOrder) {
      try {
        const tableName = tableConfig.name === 'Transaction' ? '"Transaction"' : tableConfig.name;
        const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
        console.log(`- Migrando ${rows.length} registros de ${tableConfig.name}...`);
        
        for (const row of rows) {
          const processedRow = processObject({ ...row, ...(tableConfig.extra || {}) });
          
          await (tableConfig.model as any).upsert({
            where: { id: processedRow.id },
            update: processedRow,
            create: processedRow,
          });
        }
      } catch (e: any) {
        if (e.message.includes('no such table')) {
          console.log(`- Tabela ${tableConfig.name} ignorada (não existe no SQLite)`);
        } else {
          console.warn(`⚠️ Erro na tabela ${tableConfig.name}: ${e.message}`);
        }
      }
    }

    console.log('✅ Migração finalizada com sucesso!');
  } catch (error) {
    console.error('❌ Erro crítico:', error);
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

migrate();
