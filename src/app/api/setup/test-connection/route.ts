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

        // Gatilho soberano Docker: escreve senha apenas se o arquivo ainda não existe
        // (evita re-inicializar o banco a cada teste)
        const sharedPath = "/var/shared/db_init_password.txt";
        try {
            if (fs.existsSync("/var/shared") && !fs.existsSync(sharedPath)) {
                console.log("[SETUP] Escrevendo gatilho de senha soberana...");
                fs.writeFileSync(sharedPath, dbPassword);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        } catch (e) {
            console.warn("[SETUP] Falha ao gravar gatilho (não é ambiente Docker de produção):", e);
        }

        const safePassword = encodeURIComponent(dbPassword);
        const buildConnStr = (pwd: string, db: string) =>
            `postgresql://${dbUser}:${encodeURIComponent(pwd)}@${dbHost}:${dbPort}/${db}`;

        const tryConnect = async (connStr: string): Promise<Client | null> => {
            const c = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
            try {
                await c.connect();
                await c.query("SELECT 1");
                return c;
            } catch {
                try { await c.end(); } catch {}
                return null;
            }
        };

        // Passo 1: tentar com a senha fornecida
        let workingConnStr = buildConnStr(dbPassword, dbName);
        let client = await tryConnect(workingConnStr);
        let statusMessage = "Banco de dados conectado e tabelas criadas com sucesso!";

        if (!client) {
            // Passo 2: tentar fallbacks de fábrica para sincronizar a senha
            const fallbacks = [DATABASE_DEFAULTS.factoryPassword, ...DATABASE_DEFAULTS.factoryFallbacks];
            let synced = false;

            for (const fbPwd of fallbacks) {
                if (dbPassword === fbPwd) continue;

                // Tenta no banco alvo
                const fbClient = await tryConnect(buildConnStr(fbPwd, dbName));
                if (fbClient) {
                    try {
                        await fbClient.query(`ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
                        await fbClient.end();
                        synced = true;
                        statusMessage = "Senha sincronizada com sucesso. Tabelas criadas!";
                        console.log(`[SETUP] Senha sincronizada via fallback.`);
                        break;
                    } catch (e) {
                        await fbClient.end();
                    }
                }

                // Tenta no banco padrão 'postgres' (banco alvo pode não existir)
                const pgClient = await tryConnect(buildConnStr(fbPwd, "postgres"));
                if (pgClient) {
                    try {
                        const exists = await pgClient.query(
                            `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
                        );
                        if (exists.rows.length === 0) {
                            await pgClient.query(`CREATE DATABASE "${dbName}"`);
                            console.log(`[SETUP] Banco '${dbName}' criado.`);
                        }
                        await pgClient.query(`ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
                        await pgClient.end();
                        synced = true;
                        statusMessage = `Banco '${dbName}' criado e senha sincronizada. Tabelas criadas!`;
                        console.log(`[SETUP] Banco criado e senha sincronizada via fallback.`);
                        break;
                    } catch (e) {
                        await pgClient.end();
                    }
                }
            }

            if (!synced) {
                return NextResponse.json({
                    error: "Falha na conexão. Verifique host, porta, usuário e senha do banco."
                }, { status: 500 });
            }

            // Verificar se a conexão com a nova senha funciona
            client = await tryConnect(workingConnStr);
            if (!client) {
                return NextResponse.json({
                    error: "Senha atualizada, mas a reconexão falhou. Aguarde alguns segundos e tente novamente."
                }, { status: 500 });
            }
        }

        await client.end();

        // Passo 3: publicar o schema (prisma db push)
        // Feito aqui no step 3 para dar feedback imediato ao usuário, antes do submit final.
        console.log("[SETUP] Executando prisma db push...");
        try {
            const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
            const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

            const output = execSync(
                `"${prismaBin}" db push --accept-data-loss --schema="${schemaPath}"`,
                {
                    env: { ...process.env, DATABASE_URL: workingConnStr },
                    encoding: "utf-8",
                    timeout: 120000,
                }
            );
            console.log("[SETUP] Prisma db push OK:", output.substring(0, 300));
        } catch (pErr: any) {
            const detail = pErr.stdout || pErr.stderr || pErr.message || "Erro desconhecido";
            console.error("[SETUP] Prisma db push falhou:", detail);
            return NextResponse.json({
                error: `Conexão OK, mas falha ao criar as tabelas: ${detail.substring(0, 300)}`
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: statusMessage });
    } catch (error) {
        console.error("[TEST_CONN_API_ERROR]", error);
        return NextResponse.json({ error: "Erro interno ao testar conexão." }, { status: 500 });
    }
}
