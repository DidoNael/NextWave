import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

export async function GET(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role?.toLowerCase() as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name || name.includes('..') || name.includes('/')) {
        return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
    }

    const filePath = path.join(BACKUP_DIR, name);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${name}"`,
            'Content-Length': String(fileBuffer.length),
        },
    });
}
