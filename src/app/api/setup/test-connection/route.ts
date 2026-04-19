import { NextResponse } from "next/server";
import { Client } from "pg";

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

        const DEFAULT_BOOT_PWD = "nextwave_setup_2026";

        try {
            await client.connect();
            await client.query("SELECT 1");
            await client.end();
            
            return NextResponse.json({ 
                success: true, 
                message: "Conexão estabelecida com sucesso com sua senha!"
            });
        } catch (connErr: any) {
            console.warn("[CHECK] Falha com a senha do usuário, tentando ponte de fábrica...", connErr.code);
            
            // 2. Se falhar por erro de autenticação (invalid password), tentamos a senha de "fábrica"
            // Isso acontece se o banco subiu com a padrão e o usuário quer definir uma nova
            if (connErr.code === '28P01' && dbPassword !== DEFAULT_BOOT_PWD) {
                const factoryConnectionString = `postgresql://${dbUser}:${DEFAULT_BOOT_PWD}@${dbHost}:${dbPort}/${dbName}`;
                const factoryClient = new Client({
                    connectionString: factoryConnectionString,
                    connectionTimeoutMillis: 5000,
                });

                try {
                    await factoryClient.connect();
                    await factoryClient.query("SELECT 1");
                    await factoryClient.end();

                    // Se funcionar com a padrão, avisamos ao frontend que vamos sincronizar no final
                    return NextResponse.json({ 
                        success: true, 
                        needsSync: true,
                        message: "Banco detectado! Sua nova senha será aplicada ao concluir o setup."
                    });
                } catch (factoryErr) {
                    console.error("[CHECK_FACTORY_FAILED]", factoryErr);
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
