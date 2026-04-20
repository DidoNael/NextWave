import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DATABASE_DEFAULTS } from "@/lib/constants";


export async function GET() {
    try {
        // Modo Setup: Se o singleton falhar ou der erro de autenticação, assumimos que precisa de setup
        // Não deixamos o erro travar a experiência do usuário
        let userCount = 0;
        try {
            userCount = await prisma.user.count();
        } catch (e) {
            console.warn("[SETUP_GET] Falha de conexão (esperado em setup soberano)");
            return NextResponse.json({ isConfigured: false, needsSetup: true });
        }
        return NextResponse.json({ isConfigured: userCount > 0 });
    } catch (error: any) {
        return NextResponse.json({ isConfigured: false });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { siteUrl, orgName, orgSlug, name, email, password, allowedIps, workDayStart, workDayEnd, backupData, backupName, modules, dbConfig } = body;

        // Se estivermos configurando o banco, ignoramos o check de usuários existentes (pois o banco pode estar offline ou com senha errada)
        if (!dbConfig) {
            let userCount = 0;
            try {
                userCount = await prisma.user.count();
                if (userCount > 0) {
                    return NextResponse.json({ error: "O sistema já está configurado." }, { status: 400 });
                }
            } catch (pErr) {
                console.warn("[SETUP_POST] Ignorando falha de check para setup soberano.");
            }
        }

        // Se houver backup, restaurar e retornar imediatamente
        if (backupData) {
            console.log(`[SETUP] Importação de backup detectada: ${backupName}`);
            const { DBMigrator } = await import("@/lib/db-migrator");
            const migrator = new DBMigrator(prisma);
            
            const dbUrl = process.env.DATABASE_URL;
            const isSQLFile = backupName.toLowerCase().endsWith('.sql');

            // 1. Salvar o conteúdo do backup em um arquivo temporário
            const tempPath = path.join(process.cwd(), 'data', `temp_${Date.now()}_${backupName}`);
            const buffer = Buffer.from(backupData, 'base64');
            
            if (!fs.existsSync(path.dirname(tempPath))) {
                fs.mkdirSync(path.dirname(tempPath), { recursive: true });
            }
            fs.writeFileSync(tempPath, buffer);

            try {
                if (isSQLFile) {
                    console.log(`[SETUP] Executando dump SQL no banco PostgreSQL atual`);
                    const sqlContent = buffer.toString('utf-8');
                    await migrator.executeRawSQL(sqlContent);
                } else {
                    throw new Error("Formato de backup não suportado. Use apenas arquivos .sql para este ambiente PostgreSQL.");
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
            
            // Gatilho Web Soberano (Caso não tenha sido disparado no teste)
            try {
                if (fs.existsSync("/var/shared")) {
                    fs.writeFileSync("/var/shared/db_init_password.txt", dbPassword);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (e) {}

            // Sincronizar senha via ponte de fábrica (Multi-Fallback Resiliente)
            try {
                const { Client } = await import("pg");
                const fallbacks = [DATABASE_DEFAULTS.factoryPassword, ...DATABASE_DEFAULTS.factoryFallbacks];
                let connected = false;

                // Tentar conexão direta primeiro
                const directClient = new Client({
                    connectionString: `postgresql://${user}:${dbPassword}@${host}:${port}/${database}`,
                    connectionTimeoutMillis: 5000,
                });
                try {
                    await directClient.connect();
                    await directClient.end();
                    connected = true;
                } catch (e) {
                    console.warn("[SETUP] Senha direta falhou, tentando fallbacks...");
                }

                if (!connected) {
                    for (const fallbackPwd of fallbacks) {
                        if (dbPassword === fallbackPwd) continue;
                        const factoryClient = new Client({
                            connectionString: `postgresql://${user}:${fallbackPwd}@${host}:${port}/${database}`,
                            connectionTimeoutMillis: 5000,
                        });

                        try {
                            await factoryClient.connect();
                            await factoryClient.query(`ALTER USER ${user} WITH PASSWORD '${dbPassword}'`);
                            await factoryClient.end();
                            connected = true;
                            console.log(`[SETUP] Senha sincronizada com sucesso usando fallback: ${fallbackPwd}`);
                            break;
                        } catch (fErr) {
                            console.warn(`[SETUP] Fallback ${fallbackPwd} falhou.`);
                        }
                    }
                }
            } catch (dbErr) {
                console.error("[SETUP_DB_SYNC_ERROR]", dbErr);
            }
            
            // Salvar no .env
            const envPath = path.join(process.cwd(), ".env");
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
            
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
            
            fs.writeFileSync(envPath, envContent);

            // Sincronizar Schema
            console.log(`[SETUP] Sincronizando schema...`);
            try {
                const { execSync } = await import("child_process");
                process.env.DATABASE_URL = dbUrl;
                execSync("npx prisma db push --accept-data-loss", { env: process.env });
            } catch (pErr) { console.error("Prisma push failed", pErr); }

        // 3. Conexão Dinâmica: Usar a senha que ACABOU de ser definida (v3.0.4 Soberana)
        console.log(`[SETUP] Iniciando conexão dinâmica para finalização...`);
        const tempPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: dbUrl,
                },
            },
        });

        try {
            // 3. Criar Organização primeiro (Essencial para SASS v3.0.0) - Com Idempotência (v3.0.6)
            console.log(`[SETUP] Sincronizando organização master: ${orgName}`);
            const organization = await tempPrisma.organization.upsert({
                where: { slug: orgSlug || "master" },
                update: {
                    name: orgName || "NextWave Master",
                    siteUrl: siteUrl || "",
                },
                create: {
                    name: orgName || "NextWave Master",
                    slug: orgSlug || "master",
                    siteUrl: siteUrl || "",
                }
            });

            // 4. Criar o usuário administrador vinculado à organização - Com Idempotência (v3.0.6)
            const hashedPassword = await bcrypt.hash(password, 12);
            await tempPrisma.user.upsert({
                where: { email: email },
                update: {
                    name,
                    password: hashedPassword,
                    role: "master",
                    organizationId: organization.id,
                },
                create: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "master",
                    allowedIps: allowedIps || "*",
                    workDayStart: workDayStart || null,
                    workDayEnd: workDayEnd || null,
                    organizationId: organization.id,
                },
            });

            // 5. Salvar Branding
            if (siteUrl) {
                await (tempPrisma as any).systemBranding.upsert({
                    where: { id: "default" },
                    update: { siteUrl, name: orgName },
                    create: { id: "default", siteUrl, name: orgName },
                });
            }

            // 6. Configurar Módulos
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
                    await (tempPrisma as any).systemModule.upsert({
                        where: { key: m.key },
                        update: { enabled: modules.includes(m.key) },
                        create: { key: m.key, name: m.label, enabled: modules.includes(m.key) }
                    });
                }

                // 7. Configuração Inicial do WhatsApp no banco
                if (modules.includes("whatsapp")) {
                    const evolutionKey = crypto.randomUUID();
                    const evolutionUrl = "http://evolution-api:8081";
                    
                    await (tempPrisma as any).whatsAppConfig.upsert({
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
        } finally {
            await tempPrisma.$disconnect();
        }
    }

        // 7. Persistência Consolidada no .env
        try {
            const envPath = path.join(process.cwd(), ".env");
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

            if (siteUrl) {
                if (envContent.includes("NEXTAUTH_URL=")) {
                    envContent = envContent.replace(/NEXTAUTH_URL=.*/, `NEXTAUTH_URL="${siteUrl}"`);
                } else {
                    envContent += `NEXTAUTH_URL="${siteUrl}"\n`;
                }
            }

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
        } catch (envError) {
            console.error("[SETUP_ENV_PERSISTENCE_ERROR]", envError);
        }

        // 8. Hot-Reload Soberano: Reiniciar processo para carregar novo .env (v3.0.6)
        console.log(`[SETUP] Setup concluído. Reiniciando container para aplicar soberania...`);
        setTimeout(() => {
            console.log(`[SETUP] SINAL DE REINÍCIO ENVIADO.`);
            process.exit(0); 
        }, 2000);

        return NextResponse.json({
            success: true,
            message: "Sistema configurado com sucesso! Redirecionando...",
        });
    } catch (error) {
        console.error("[SETUP_API_ERROR]", error);
        return NextResponse.json(
            { error: "Erro ao realizar configuração inicial." },
            { status: 500 }
        );
    }
}
