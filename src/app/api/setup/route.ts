import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({
            isConfigured: userCount > 0
        });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao verificar status do sistema" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // 1. Verificar se já existe algum usuário
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json(
                { error: "O sistema já está configurado." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { siteUrl, name, email, password, allowedIps, workDayStart, workDayEnd, backupData, backupName, modules, dbConfig } = body;

        // Se houver backup, restaurar e retornar imediatamente
        if (backupData) {
            console.log(`[SETUP] Importação de backup detectada: ${backupName}`);
            const { DBMigrator } = await import("@/lib/db-migrator");
            const migrator = new DBMigrator(prisma);
            
            const dbUrl = process.env.DATABASE_URL || 'file:./data/prod.db';
            const isSQLite = dbUrl.startsWith('file:');
            const isSQLFile = backupName.toLowerCase().endsWith('.sql');

            // 1. Salvar o conteúdo do backup em um arquivo temporário
            const tempPath = path.join(process.cwd(), 'data', `temp_${Date.now()}_${backupName}`);
            const buffer = Buffer.from(backupData, 'base64');
            
            if (!fs.existsSync(path.dirname(tempPath))) {
                fs.mkdirSync(path.dirname(tempPath), { recursive: true });
            }
            fs.writeFileSync(tempPath, buffer);

            try {
                if (isSQLite && !isSQLFile) {
                    // Cenário: SQLite -> SQLite (Sobrescrita direta)
                    let dbPath: string;
                    const rel = dbUrl.replace('file:', '');
                    dbPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
                    
                    await prisma.$disconnect();
                    fs.copyFileSync(tempPath, dbPath);
                    console.log(`[SETUP] Banco SQLite sobrescrito em: ${dbPath}`);
                } 
                else if (!isSQLite && !isSQLFile) {
                    // Cenário: SQLite (.db) -> Postgres/MySQL (Migração de Dados)
                    console.log(`[SETUP] Iniciando migração SQLite -> Database Remoto`);
                    await migrator.migrateFromSQLite(tempPath);
                }
                else if (isSQLFile) {
                    // Cenário: SQL (.sql) -> Qualquer Banco (Execução de Script)
                    console.log(`[SETUP] Executando dump SQL no banco atual`);
                    const sqlContent = buffer.toString('utf-8');
                    await migrator.executeRawSQL(sqlContent);
                }

                // Limpar arquivo temporário
                fs.unlinkSync(tempPath);

                return NextResponse.json({
                    success: true,
                    message: 'Backup restaurado com sucesso! Seus dados foram migrados para o novo ambiente.',
                    restored: true,
                });
            } catch (err: any) {
                console.error("[SETUP_BACKUP_ERROR]", err);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                return NextResponse.json({ 
                    error: `Falha na restauração: ${err.message || 'Erro desconhecido'}` 
                }, { status: 500 });
            }
        }

        // 2. Configurar Banco de Dados se fornecido
        if (dbConfig) {
            const { host, port, user, password: dbPassword, database } = dbConfig;
            const dbUrl = `postgresql://${user}:${dbPassword}@${host}:${port}/${database}?schema=public`;
            
            console.log(`[SETUP] Configurando DATABASE_URL dinamicamente...`);
            
            // Salvar no .env (Para persistência entre reinicializações)
            const envPath = path.join(process.cwd(), ".env");
            let envContent = "";
            
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, "utf-8");
                if (envContent.includes("DATABASE_URL=")) {
                    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${dbUrl}"`);
                } else {
                    envContent += `\nDATABASE_URL="${dbUrl}"\n`;
                }
            } else {
                envContent = `DATABASE_URL="${dbUrl}"\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log(`[SETUP] Arquivo .env atualizado com sucesso.`);
            
            // ATENÇÃO: Em ambiente de produção Docker, o ideal é que o DATABASE_URL
            // seja passado como variável de ambiente, mas para setup inicial
            // gravar no .env permite que o próximo boot do container pegue a info.
        }

        // 3. Criar o usuário administrador
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "master",
                allowedIps: allowedIps || "*",
                workDayStart: workDayStart || null,
                workDayEnd: workDayEnd || null,
            },
        });

        // 3. Salvar URL do sistema
        if (siteUrl) {
            await (prisma as any).systemBranding.upsert({
                where: { id: "default" },
                update: { siteUrl },
                create: { id: "default", siteUrl },
            });
        }

        // 4. Configurar Módulos
        if (modules && Array.isArray(modules)) {
            const allPossibleModules = [
                { key: "clientes", label: "Clientes" },
                { key: "financeiro", label: "Financeiro" },
                { key: "projetos", label: "Projetos" },
                { key: "servicos", label: "Serviços" },
                { key: "agenda", label: "Agenda" },
                { key: "whatsapp", label: "WhatsApp" },
                { key: "usuarios", label: "Usuários" }
            ];

            for (const m of allPossibleModules) {
                await (prisma as any).systemModule.upsert({
                    where: { key: m.key },
                    update: { enabled: modules.includes(m.key) },
                    create: { key: m.key, name: m.label, enabled: modules.includes(m.key) }
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Administrador criado com sucesso!",
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (error) {
        console.error("[SETUP_API_ERROR]", error);
        return NextResponse.json(
            { error: "Erro ao realizar configuração inicial." },
            { status: 500 }
        );
    }
}
