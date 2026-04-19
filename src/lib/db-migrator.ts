// @ts-nocheck
import { PrismaClient } from '@prisma/client';
// import Database from 'better-sqlite3'; // REMOVIDO: Sistema agora é PostgreSQL-only

/**
 * Utilitário para migrar dados de um arquivo SQLite para o banco conectado via Prisma.
 */
export class DBMigrator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private convertValue(key: string, value: any) {
    if (value === null || value === undefined) return null;

    // Campos booleanos (SQLite armazena 0 ou 1)
    const booleanFields = [
      'twoFactorEnabled', 'notifyEmail', 'notifyPush', 'notifyDue', 
      'isActive', 'fromMe', 'allDay', 'enabled', 'isDefault', 
      'secure', 'isTrial', 'isConfigured'
    ];
    if (booleanFields.includes(key)) {
      return value === 1 || value === true || value === 'true';
    }

    // Campos de data
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

  private processObject(obj: any) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = this.convertValue(key, value);
    }
    return newObj;
  }

  /**
   * [DESATIVADO] Migração de SQLite para o banco atual.
   * Removido para suportar arquitetura PostgreSQL-only sem dependências nativas extras.
   */
  async migrateFromSQLite(sqlitePath: string) {
    throw new Error('Migração direta de arquivos .db (SQLite) não é mais suportada nesta versão PostgreSQL-only.');
  }

  /**
   * Executa comandos SQL puros (útil para restores de dump)
   */
  async executeRawSQL(sqlContent: string) {
    console.log('[DB_MIGRATOR] Iniciando execução de SQL Raw');
    
    // 1. Limpeza agressiva de comentários e lixo
    // Remove o BOM (Byte Order Mark) se presente (comum em arquivos do Windows)
    let filteredSql = sqlContent.replace(/^\uFEFF/, '');

    // Remove comentários de múltiplas linhas /* ... */
    filteredSql = filteredSql.replace(/\/\*[\s\S]*?\*\//g, ' ');
    
    // Remove comentários condicionais estilo MySQL /*!40101 ... */
    filteredSql = filteredSql.replace(/\/\*\![\s\S]*?\*\//g, ' ');

    const lines = filteredSql.split('\n');
    const cleanLines = lines.map(line => {
      // Remove comentário de linha única -- ou #
      let simpleLine = line.split('--')[0];
      simpleLine = simpleLine.split('#')[0];
      return simpleLine.trim();
    }).filter(line => line.length > 0);

    const cleanContent = cleanLines.join(' ');

    // 2. Parser para dividir comandos respeitando aspas
    const commands: string[] = [];
    let currentCommand = '';
    let inString = false;

    for (let i = 0; i < cleanContent.length; i++) {
       const char = cleanContent[i];
       
       if (char === "'" && (i === 0 || cleanContent[i-1] !== '\\')) {
         inString = !inString;
       }

       if (char === ';' && !inString) {
         if (currentCommand.trim()) {
           commands.push(currentCommand.trim());
         }
         currentCommand = '';
       } else {
         currentCommand += char;
       }
    }

    if (currentCommand.trim()) {
      commands.push(currentCommand.trim());
    }

    console.log(`[DB_MIGRATOR] Comandos detectados após limpeza: ${commands.length}`);

    // 3. Execução inteligente
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i].trim();
      if (!cmd) continue;

      const upperCmd = cmd.toUpperCase();

      // Ignorar comandos inofensivos ou específicos de outros bancos que o Prisma rejeita
      const skipPrefixes = [
        'BEGIN', 'COMMIT', 'ROLLBACK', // Transações manuais falham no Prisma
        'SET ', 'PRAGMA ', 'SELECT ', 'USE ', 'SHOW ' // Configurações de sessão e metadados
      ];

      if (skipPrefixes.some(p => upperCmd.startsWith(p))) {
        // Log discreto para evitar poluição mas dar visibilidade
        if (i < 5) console.log(`[DB_MIGRATOR] Pulando config: ${cmd.substring(0, 30)}...`);
        continue;
      }

      try {
        await this.prisma.$executeRawUnsafe(cmd);
      } catch (error) {
        console.error(`[DB_MIGRATOR_ERROR] Falha no comando ${i + 1}:`, cmd.substring(0, 200));
        
        // Se for erro de sintaxe em comandos não-críticos (DROP, ALTER), continua
        if (upperCmd.startsWith('DROP') || upperCmd.startsWith('ALTER')) {
           console.warn(`[DB_MIGRATOR_WARN] Ignorando erro DDL: ${cmd.substring(0, 50)}`);
           continue;
        }

        // Retorna o comando que falhou na mensagem para o usuário poder identificar
        const snippet = cmd.length > 100 ? cmd.substring(0, 100) + '...' : cmd;
        throw new Error(`Erro no comando SQL ${i + 1} ["${snippet}"]: ${error.message}`);
      }
    }
    
    return { success: true, count: commands.length };
  }
}
