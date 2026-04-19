import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { id: 'default' },
    });

    return NextResponse.json(config || {});
  } catch (error) {
    console.error('[WHATSAPP_CONFIG_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { apiUrl, globalApiKey, instanceName, token, isActive } = body;

    const config = await prisma.whatsAppConfig.upsert({
      where: { id: 'default' },
      update: {
        apiUrl,
        globalApiKey,
        instanceName,
        token,
        isActive,
      },
      create: {
        id: 'default',
        apiUrl,
        globalApiKey,
        instanceName,
        token,
        isActive,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('[WHATSAPP_CONFIG_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
