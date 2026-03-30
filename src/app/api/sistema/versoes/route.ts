import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'versions.json');
        const content = fs.readFileSync(filePath, 'utf-8');
        const versions = JSON.parse(content);
        return NextResponse.json(versions);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}
