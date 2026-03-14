import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const ALLOWED_COMMANDS = {
  pull: "git pull",
  reset: "git checkout . && git clean -fd",
  install: "npm install",
  generate: "npx prisma generate",
  push: "npx prisma db push",
  build: "npm run build",
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Restrição rigorosa para role "master"
    if (!session || session.user?.role !== "master") {
      return new NextResponse("Não autorizado. Apenas administradores master podem executar atualizações.", { status: 403 });
    }

    const { command } = await req.json();

    if (!command || !ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS]) {
      return new NextResponse("Comando inválido ou não permitido.", { status: 400 });
    }

    const shellCommand = ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS];
    
    console.log(`[SYSTEM_UPDATE] Executing: ${shellCommand}`);
    
    const { stdout, stderr } = await execPromise(shellCommand);

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
    });
  } catch (error: any) {
    console.error("[SYSTEM_UPDATE_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
    }, { status: 500 });
  }
}
