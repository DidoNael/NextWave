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

const TRANSLATIONS: Record<string, string> = {
  "Already up to date.": "O sistema já está na versão mais recente.",
  "Everything up-to-date": "Tudo atualizado.",
  "Fast-forward": "Atualização rápida aplicada.",
  "Aborting": "Abortando operação.",
  "Permission denied": "Permissão negada.",
  "Command failed": "O comando falhou.",
  "up to date": "atualizado",
  "added": "adicionado",
  "removed": "removido",
  "changed": "alterado",
};

function translateOutput(text: string) {
  if (!text) return text;
  let translated = text;
  Object.entries(TRANSLATIONS).forEach(([en, pt]) => {
    translated = translated.replace(new RegExp(en, 'g'), pt);
  });
  return translated;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session || (session.user?.role !== "master" && session.user?.role !== "admin")) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autorizado." 
      }, { status: 403 });
    }

    const { command } = await req.json();

    if (!command || !ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS]) {
      return NextResponse.json({ 
        success: false, 
        error: "Comando inválido." 
      }, { status: 400 });
    }

    const shellCommand = ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS];
    console.log(`[SYSTEM_UPDATE] Executing: ${shellCommand}`);
    
    const { stdout, stderr } = await execPromise(shellCommand, { cwd: "/app" });

    return NextResponse.json({
      success: true,
      stdout: translateOutput(stdout),
      stderr: translateOutput(stderr),
    });
  } catch (error: any) {
    console.error("[SYSTEM_UPDATE_ERROR]", error);
    return NextResponse.json({
      success: false,
      error: translateOutput(error.message),
      stdout: translateOutput(error.stdout),
      stderr: translateOutput(error.stderr),
    }, { status: 500 });
  }
}
