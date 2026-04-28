import { NextResponse } from "next/server";
import { Client } from "pg";
import { DATABASE_DEFAULTS } from "@/lib/constants";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { dbHost, dbPort, dbUser, dbPassword, dbName } = body;

        if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
            return NextResponse.json({ error: "Todos os campos do banco são obrigatórios." }, { status: 400 });
        }

        const sharedPath = "/var/shared/db_init_password.txt";
        let isFirstTime = false;

        // 1. Gatilho soberano Docker
        if (fs.existsSync("/var/shared") && !fs.existsSync(sharedPath)) {
            console.log("[SETUP] Escrevendo gatilho de senha soberana...");
            fs.writeFileSync(sharedPath, dbPassword);
            isFirstTime = true;
            console.log("[SETUP] Aguardando 15 segundos para o boot inicial do Postgres...");
            await new Promise(resolve => setTimeout(resolve, 15000));
        }

        const buildConnStr = (pwd: string, db: string) =>
            `postgresql://${dbUser}:${encodeURIComponent(pwd)}@${dbHost}:${dbPort}/${db}`;

        const tryConnect = async (connStr: string, retries = 5): Promise<Client | null> => {
            for (let i = 0; i < retries; i++) {
                const c = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
                try {
                    await c.connect();
                    return c;
                } catch (e: any) {
                    try { await c.end(); } catch {}
                    console.log(`[SETUP] Tentativa ${i+1}/${retries} falhou: ${e.message}`);
                    if (i < retries - 1) await new Promise(r => setTimeout(r, 3000));
                }
            }
            return null;
        };

        let synced = false;
        let statusMessage = "Banco de dados conectado e tabelas sincronizadas!";
        let workingConnStr = buildConnStr(dbPassword, dbName);

        // PASSO 1: Tentar conexão direta (Caminho feliz)
        console.log(`[SETUP] Tentando conexão direta com o banco '${dbName}'...`);
        let client = await tryConnect(workingConnStr, isFirstTime ? 10 : 3);

        if (!client) {
            console.log(`[SETUP] Conexão direta falhou. Tentando criar o banco '${dbName}' via base 'postgres'...`);
            // PASSO 2: Tentar entrar no banco 'postgres' com a senha fornecida para criar o banco alvo
            const pgClient = await tryConnect(buildConnStr(dbPassword, "postgres"), 2);
            if (pgClient) {
                try {
                    const exists = await pgClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
                    if (exists.rows.length === 0) {
                        await pgClient.query(`CREATE DATABASE "${dbName}"`);
                        console.log(`[SETUP] Banco '${dbName}' criado com sucesso.`);
                    }
                    await pgClient.end();
                    synced = true;
                } catch (e: any) {
                    await pgClient.end();
                    console.error("[SETUP] Erro ao criar banco via postgres:", e.message);
                }
            }

            if (!synced) {
                // PASSO 3: Fallbacks de fábrica (casos onde o banco já existia com outra senha)
                const fallbacks = [DATABASE_DEFAULTS.factoryPassword, ...DATABASE_DEFAULTS.factoryFallbacks];
                for (const fbPwd of fallbacks) {
                    if (dbPassword === fbPwd) continue;
                    
                    const fbPgClient = await tryConnect(buildConnStr(fbPwd, "postgres"), 1);
                    if (fbPgClient) {
                        try {
                            const exists = await fbPgClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
                            if (exists.rows.length === 0) {
                                await fbPgClient.query(`CREATE DATABASE "${dbName}"`);
                            }
                            await fbPgClient.query(`ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
                            await fbPgClient.end();
                            synced = true;
                            console.log(`[SETUP] Senha sincronizada via fallback.`);
                            break;
                        } catch {
                            await fbPgClient.end();
                        }
                    }
                }
            }

            if (synced) {
                // Tenta reconectar agora que o banco existe e a senha está certa
                client = await tryConnect(workingConnStr, 3);
            }
        }

        if (!client) {
            return NextResponse.json({ 
                error: "Não foi possível conectar ao banco. Verifique se o nome do banco, usuário e senha estão corretos e se o container do banco está rodando." 
            }, { status: 500 });
        }

        await client.end();

        // PASSO 4: Sincronizar Schema (Prisma DB Push)
        console.log("[SETUP] Iniciando prisma db push...");
        try {
            const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
            const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

            const output = execSync(
                `"${prismaBin}" db push --accept-data-loss --schema="${schemaPath}"`,
                {
                    env: { ...process.env, DATABASE_URL: workingConnStr },
                    encoding: "utf-8",
                    timeout: 180000, // 3 minutos
                }
            );
            console.log("[SETUP] Schema push OK.");
        } catch (pErr: any) {
            const detail = pErr.stdout || pErr.stderr || pErr.message || "Erro desconhecido no Prisma";
            console.error("[SETUP] Falha no Prisma:", detail);
            return NextResponse.json({ 
                error: `Conexão OK, mas erro ao criar tabelas: ${detail.substring(0, 300)}` 
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: statusMessage });

    } catch (error: any) {
        console.error("[TEST_CONN_API_ERROR]", error);
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
