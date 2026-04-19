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
        
        const client = new Client({
            connectionString,
            connectionTimeoutMillis: 5000, // 5 segundos de timeout
        });

        try {
            await client.connect();
            await client.query("SELECT 1");
            await client.end();
            
            return NextResponse.json({ 
                success: true, 
                message: "Conexão estabelecida com sucesso!",
                connectionString
            });
        } catch (connErr: any) {
            console.error("[TEST_CONN_ERROR]", connErr);
            return NextResponse.json({ 
                error: `Falha na conexão: ${connErr.message || "Verifique as credenciais e se o banco está pronto."}` 
            }, { status: 500 });
        }
    } catch (error) {
        console.error("[TEST_CONN_API_ERROR]", error);
        return NextResponse.json({ error: "Erro interno ao testar conexão." }, { status: 500 });
    }
}
