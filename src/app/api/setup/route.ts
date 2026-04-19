import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
            
            const dbUrl = process.env.DATABASE_URL;
            const isSQLite = dbUrl?.startsWith('file:') || false;
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
                    // Cenário: Instalação Limpa / Banco Remoto
                    console.log(`[SETUP] Iniciando configuração de Banco de Dados PostgreSQL`);
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

            // NOVA LÓGICA: Sincronizar senha com o banco PostgreSQL
            try {
                // Tentamos mudar a senha do usuário administrativo no banco
                // Isso permitirá que a nova senha escolhida no Wizard funcione imediatamente
                await prisma.$executeRawUnsafe(`ALTER USER ${user} WITH PASSWORD '${dbPassword}'`);
                console.log(`[SETUP] Senha do banco sincronizada com sucesso.`);
            } catch (dbErr) {
                console.warn(`[SETUP] Aviso: Não foi possível mudar a senha no banco (talvez já esteja correta).`, dbErr);
            }
            
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

            // Também salvamos a senha do POSTGRES base para o Docker
            if (envContent.includes("POSTGRES_PASSWORD=")) {
                envContent = envContent.replace(/POSTGRES_PASSWORD=.*/, `POSTGRES_PASSWORD="${dbPassword}"`);
            } else {
                envContent += `POSTGRES_PASSWORD="${dbPassword}"\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log(`[SETUP] Arquivo .env atualizado com sucesso.`);
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

        }

        // 3. Salvar URL do sistema no banco
        if (siteUrl) {
            await (prisma as any).systemBranding.upsert({
                where: { id: "default" },
                update: { siteUrl },
                create: { id: "default", siteUrl },
            });
        }

        // 4. Configurar Módulos no banco
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

            // 5. Configuração Inicial do WhatsApp no banco
            if (modules.includes("whatsapp")) {
                const evolutionKey = crypto.randomUUID();
                const evolutionUrl = "http://evolution-api:8081";
                
                await (prisma as any).whatsAppConfig.upsert({
                    where: { id: "default" },
                    update: { 
                        globalApiKey: evolutionKey,
                        apiUrl: evolutionUrl,
                        isActive: true
                    },
                    create: { 
                        id: "default",
                        globalApiKey: evolutionKey,
                        apiUrl: evolutionUrl,
                        instanceName: "NextWave",
                        isActive: true,
                        waVersion: "2.3000.x"
                    }
                });
            }
        }

        // 6. Persistência Consolidada no .env (Zero Config Holístico)
        try {
            const envPath = path.join(process.cwd(), ".env");
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

            // Atualizar DATABASE_URL
            if (dbConfig) {
                const { host, port, user, password: dbPassword, database } = dbConfig;
                const dbUrl = `postgresql://${user}:${dbPassword}@${host}:${port}/${database}?schema=public`;
                
                if (envContent.includes("DATABASE_URL=")) {
                    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${dbUrl}"`);
                } else {
                    envContent += `\nDATABASE_URL="${dbUrl}"\n`;
                }

                if (envContent.includes("POSTGRES_PASSWORD=")) {
                    envContent = envContent.replace(/POSTGRES_PASSWORD=.*/, `POSTGRES_PASSWORD="${dbPassword}"`);
                } else {
                    envContent += `POSTGRES_PASSWORD="${dbPassword}"\n`;
                }
            }

            // Atualizar NEXTAUTH_URL (Resolve acesso via IP)
            if (siteUrl) {
                if (envContent.includes("NEXTAUTH_URL=")) {
                    envContent = envContent.replace(/NEXTAUTH_URL=.*/, `NEXTAUTH_URL="${siteUrl}"`);
                } else {
                    envContent += `NEXTAUTH_URL="${siteUrl}"\n`;
                }
            }

            // Atualizar EVOLUTION_API_KEY
            if (modules && modules.includes("whatsapp")) {
                const config = await (prisma as any).whatsAppConfig.findUnique({ where: { id: "default" } });
                if (config?.globalApiKey) {
                    if (envContent.includes("EVOLUTION_API_KEY=")) {
                        envContent = envContent.replace(/EVOLUTION_API_KEY=.*/, `EVOLUTION_API_KEY="${config.globalApiKey}"`);
                    } else {
                        envContent += `EVOLUTION_API_KEY="${config.globalApiKey}"\n`;
                    }
                }
            }

            fs.writeFileSync(envPath, envContent);
            console.log(`[SETUP] Arquivo .env consolidado e atualizado com sucesso.`);
        } catch (envError) {
            console.error("[SETUP_ENV_PERSISTENCE_ERROR]", envError);
            // Não travamos o setup se falhar apenas a escrita no arquivo, mas logamos o erro
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
