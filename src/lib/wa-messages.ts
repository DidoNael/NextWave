/**
 * Módulo de persistência de mensagens WhatsApp
 * Tabela isolada: wa_messages — sem relação com as tabelas de negócio
 */
import { prisma } from "@/lib/db";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS wa_messages (
    id            TEXT PRIMARY KEY,
    instance_name TEXT NOT NULL,
    remote_jid    TEXT NOT NULL,
    message_id    TEXT,
    body          TEXT NOT NULL,
    from_me       INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'PENDING',
    timestamp     INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const CREATE_IDX_SQL = `
CREATE INDEX IF NOT EXISTS idx_wa_messages_remote_jid
ON wa_messages (instance_name, remote_jid, timestamp DESC)`;

let tableReady = false;

async function ensureTable() {
    if (tableReady) return;
    await prisma.$executeRawUnsafe(CREATE_TABLE_SQL);
    await prisma.$executeRawUnsafe(CREATE_IDX_SQL);
    tableReady = true;
}

export interface WaMessage {
    id: string;
    instanceName: string;
    remoteJid: string;
    messageId?: string | null;
    body: string;
    fromMe: boolean;
    status: string;
    timestamp: number;
}

export async function saveWaMessage(msg: WaMessage) {
    await ensureTable();
    await prisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO wa_messages
            (id, instance_name, remote_jid, message_id, body, from_me, status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        msg.id,
        msg.instanceName,
        msg.remoteJid,
        msg.messageId ?? null,
        msg.body,
        msg.fromMe ? 1 : 0,
        msg.status,
        msg.timestamp
    );
}

export async function getWaMessages(instanceName: string, remoteJid: string, limit = 50): Promise<any[]> {
    await ensureTable();
    const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM wa_messages
         WHERE instance_name = ? AND remote_jid = ?
         ORDER BY timestamp ASC
         LIMIT ?`,
        instanceName,
        remoteJid,
        limit
    );
    return rows.map((r) => ({
        id: r.id,
        body: r.body,
        fromMe: r.from_me === 1,
        status: r.status,
        timestamp: r.timestamp,
        time: new Date(r.timestamp * 1000).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        }),
    }));
}
