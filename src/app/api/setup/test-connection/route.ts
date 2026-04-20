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
                    // Se falhar por autenticação no banco 'postgres', tentamos com a senha de fábrica
                    if (createErr.code === '28P01') {
                         const factoryAdminStr = `postgresql://${dbUser}:${DEFAULT_BOOT_PWD}@${dbHost}:${dbPort}/postgres`;
                         const factoryAdminClient = new Client({ connectionString: factoryAdminStr, connectionTimeoutMillis: 5000 });
                         try {
                             await factoryAdminClient.connect();
                             await factoryAdminClient.query(`CREATE DATABASE "${dbName}"`);
                             await factoryAdminClient.end();
                             return NextResponse.json({ 
                                 success: true, 
                                 needsSync: true,
                                 message: `Banco '${dbName}' criado via ponte de fábrica! Sincronização pendente.`
                             });
                         } catch (e) { console.error("[CHECK_FACTORY_CREATE_FAILED]", e); }
                    }
                }
            }

            // 2. Se falhar por erro de autenticação (invalid password), tentamos a senha de "fábrica"
            if (connErr.code === '28P01' && dbPassword !== DEFAULT_BOOT_PWD) {
                const factoryConnectionString = `postgresql://${dbUser}:${DEFAULT_BOOT_PWD}@${dbHost}:${dbPort}/${dbName}`;
                const factoryClient = new Client({
                    connectionString: factoryConnectionString,
                    connectionTimeoutMillis: 5000,
                });

                try {
                    await factoryClient.connect();
                    // Sincronizar Senha SOBERANA: Forçamos o banco a aceitar a senha do usuário AGORA.
                    await factoryClient.query(`ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
                    await factoryClient.end();

                    return NextResponse.json({ 
                        success: true, 
                        message: "Sua senha foi sincronizada com sucesso no banco de dados!"
                    });
                } catch (factoryErr: any) {
                    console.error("[CHECK_FACTORY_FAILED]", factoryErr);
                    // Se o banco não existir nem com a senha de fábrica, tentamos criar via 'postgres' com senha de fábrica
                    if (factoryErr.code === '3D000') {
                         const factoryAdminStr = `postgresql://${dbUser}:${DEFAULT_BOOT_PWD}@${dbHost}:${dbPort}/postgres`;
                         const factoryAdminClient = new Client({ connectionString: factoryAdminStr, connectionTimeoutMillis: 5000 });
                         try {
                             await factoryAdminClient.connect();
                             await factoryAdminClient.query(`CREATE DATABASE "${dbName}"`);
                             // Após criar, já mudamos a senha também no banco postgres para garantir sincronia plena
                             await factoryAdminClient.query(`ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
                             await factoryAdminClient.end();
                             
                             return NextResponse.json({ 
                                 success: true, 
                                 message: `Banco '${dbName}' criado e sua senha sincronizada via ponte de fábrica!`
                             });
                         } catch (e) { console.error("[CHECK_FACTORY_ADMIN_CREATE_FAILED]", e); }
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
