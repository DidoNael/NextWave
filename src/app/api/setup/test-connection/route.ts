import { NextResponse } from "next/server";
import { Client } from "pg";
import { DATABASE_DEFAULTS } from "@/lib/constants";


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { dbHost, dbPort, dbUser, dbPassword, dbName } = body;

        if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
            return NextResponse.json({ error: "Todos os campos do banco são obrigatórios." }, { status: 400 });
        }

        // Construir string de conexão para teste
        const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
        
        // 1. Tentar conectar com a senha que o usuário digitou
        let client = new Client({
            connectionString,
            connectionTimeoutMillis: 5000,
        });

        const DEFAULT_BOOT_PWD = DATABASE_DEFAULTS.factoryPassword;


        try {
            await client.connect();
            await client.query("SELECT 1");
            await client.end();
            
            return NextResponse.json({ 
                success: true, 
                message: "Conexão estabelecida com sucesso com sua senha!"
            });
        } catch (connErr: any) {
            console.warn("[CHECK] Analisando falha de conexão...", connErr.code, connErr.message);
            
            // TRATAMENTO: Banco de dados não existe (Código 3D000 no Postgres)
            // Vamos tentar criar o banco dinamicamente!
            if (connErr.code === '3D000') {
                console.log(`[CHECK] Banco ${dbName} não existe. Tentando criar via banco 'postgres'...`);
                const adminConnStr = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`;
                const adminClient = new Client({ connectionString: adminConnStr, connectionTimeoutMillis: 5000 });
                
                try {
                    await adminClient.connect();
                    // Importante: CREATE DATABASE não aceita parâmetros, usamos template literal com cuidado
                    await adminClient.query(`CREATE DATABASE "${dbName}"`);
                    await adminClient.end();
                    
                    return NextResponse.json({ 
                        success: true, 
                        message: `Banco de dados '${dbName}' criado e conectado com sucesso!`
                    });
                } catch (createErr: any) {
                    console.error("[CHECK_CREATE_DB_FAILED]", createErr);
                    // Se falhar por autenticação no banco 'postgres', tentamos a MARATONA DE FALLBACKS
                    if (createErr.code === '28P01') {
                        const fallbacks = [DATABASE_DEFAULTS.factoryPassword, ...DATABASE_DEFAULTS.factoryFallbacks];
                        for (const fbPwd of fallbacks) {
                            if (dbPassword === fbPwd) continue;
                            console.log(`[CHECK] Tentando criar banco via fallback: ${fbPwd}`);
                            const factoryAdminClient = new Client({ 
                                connectionString: `postgresql://${dbUser}:${fbPwd}@${dbHost}:${dbPort}/postgres`, 
                                connectionTimeoutMillis: 5000 
                            });
                            try {
                                await factoryAdminClient.connect();
                                await factoryAdminClient.query(`CREATE DATABASE "${dbName}"`);
                                // Aproveitamos e já mudamos a senha do usuário
                                await factoryAdminClient.query(`ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
                                await factoryAdminClient.end();
                                
                                return NextResponse.json({ 
                                    success: true, 
                                    message: `Banco '${dbName}' criado e senha sincronizada via fallback: ${fbPwd}`
                                });
                            } catch (e) {
                                console.warn(`[CHECK] Fallback de criação ${fbPwd} falhou.`);
                            }
                        }
                    }
                }
            }

            // 2. Se falhar por erro de autenticação (invalid password), tentamos os fallbacks de fábrica
            if (connErr.code === '28P01') {
                const fallbacks = [DATABASE_DEFAULTS.factoryPassword, ...DATABASE_DEFAULTS.factoryFallbacks];
                
                for (const fallbackPwd of fallbacks) {
                    if (dbPassword === fallbackPwd) continue; // Pula se já testamos
                    
                    console.log(`[CHECK] Tentando fallback de fábrica: ${fallbackPwd}`);
                    const factoryClient = new Client({
                        connectionString: `postgresql://${dbUser}:${fallbackPwd}@${dbHost}:${dbPort}/${dbName}`,
                        connectionTimeoutMillis: 5000,
                    });

                    try {
                        await factoryClient.connect();
                        await factoryClient.query(`ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
                        await factoryClient.end();
                        
                        return NextResponse.json({ 
                            success: true, 
                            message: "Conexão estabelecida e senha sincronizada via ponte de fábrica!"
                        });
                    } catch (fErr) {
                        console.warn(`[CHECK] Fallback ${fallbackPwd} falhou.`);
                    }
                }
            }

            return NextResponse.json({ 
                error: `Falha na conexão: ${connErr.message || "Verifique as credenciais."}` 
            }, { status: 500 });
        }
    } catch (error) {
        console.error("[TEST_CONN_API_ERROR]", error);
        return NextResponse.json({ error: "Erro interno ao testar conexão." }, { status: 500 });
    }
}
