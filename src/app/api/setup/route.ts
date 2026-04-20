import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DATABASE_DEFAULTS } from "@/lib/constants";


export async function GET() {
    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({
            isConfigured: userCount > 0
        });
    } catch (error: any) {
        // Se falhar a autenticação (P1000), assumimos que precisa de setup/reparo
        if (error?.code === "P1000") {
            return NextResponse.json({ isConfigured: false, needsRepair: true });
        }
        return NextResponse.json({ isConfigured: false, error: "Erro ao verificar status do sistema" });
    }
}

export async function POST(req: Request) {
    try {
        // 1. Verificar se já existe algum usuário (com resiliência a erro de senha)
        let userCount = 0;
        try {
            userCount = await prisma.user.count();
        } catch (dbErr: any) {
            // Se falhar por senha, assumimos que userCount é 0 para permitir o setup soberano
            if (dbErr?.code === "P1000") userCount = 0;
            else throw dbErr;
        }

        if (userCount > 0) {
            return NextResponse.json(
                { error: "O sistema já está configurado." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { siteUrl, orgName, orgSlug, name, email, password, allowedIps, workDayStart, workDayEnd, backupData, backupName, modules, dbConfig } = body;

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

            // Sincronizar senha via ponte de fábrica
            try {
                const { Client } = await import("pg");
                const factoryClient = new Client({
                    connectionString: `postgresql://${user}:${DATABASE_DEFAULTS.factoryPassword}@${host}:${port}/${database}`,
                    connectionTimeoutMillis: 5000,
                });

                await factoryClient.connect();
                await factoryClient.query(`ALTER USER ${user} WITH PASSWORD '${dbPassword}'`);
                await factoryClient.end();
            } catch (dbErr) {
                try {
                    await prisma.$executeRawUnsafe(`ALTER USER ${user} WITH PASSWORD '${dbPassword}'`);
                } catch (e) {
                   console.error("[SETUP_PWD_SYNC_FAILED] Falha total na sincronização de senha.");
                }
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
        }

        // 3. Criar Organização primeiro (Essencial para SASS v3.0.0)
        console.log(`[SETUP] Criando organização master: ${orgName}`);
        const organization = await prisma.organization.create({
            data: {
                name: orgName || "NextWave Master",
                slug: orgSlug || "master",
                siteUrl: siteUrl || "",
            }
        });

        // 4. Criar o usuário administrador vinculado à organização
        const hashedPassword = await bcrypt.hash(password, 12);
        const userAdmin = await prisma.user.create({
            data: {
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
            await (prisma as any).systemBranding.upsert({
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

        return NextResponse.json({
            success: true,
            message: "Administrador criado com sucesso!",
            user: { id: userAdmin.id, name: userAdmin.name, email: userAdmin.email },
        });
    } catch (error) {
        console.error("[SETUP_API_ERROR]", error);
        return NextResponse.json(
            { error: "Erro ao realizar configuração inicial." },
            { status: 500 }
        );
    }
}
