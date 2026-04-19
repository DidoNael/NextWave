import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exec, execFile } from "child_process";
import { promisify } from "util";

import { existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);
const LOCK_FILE = "/tmp/nextwave_update.lock";

const ALLOWED_COMMANDS = {
  pull: "git pull",
  reset: "git checkout . && git clean -fd",
  install: "npm install",
  generate: "npx prisma generate",
  push: "npx prisma db push",
  build: "rm -rf .next && npm run build",
  checkout: "git checkout",
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
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 403 });
    }

    const { command, version } = await req.json();

    if (!command || !ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS]) {
      return NextResponse.json({ success: false, error: "Comando inválido." }, { status: 400 });
    }

    // Verificar trava (Lock)
    if (existsSync(LOCK_FILE)) {
      return NextResponse.json({ 
        success: false, 
        error: "Uma operação de sistema já está em andamento. Aguarde a conclusão." 
      }, { status: 409 });
    }

    // Criar trava
    writeFileSync(LOCK_FILE, Date.now().toString());

    try {
      const cwd = process.cwd();
      let stdout: string;
      let stderr: string;

      if (command === "checkout") {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        const cleanVersion = (version ?? "").replace(/^v/, "");
        if (!versionRegex.test(cleanVersion)) {
          return NextResponse.json({ success: false, error: "Versão inválida." }, { status: 400 });
        }
        console.log(`[SYSTEM_UPDATE] Executing: git checkout v${cleanVersion}`);
        const result = await execFilePromise("git", ["checkout", `v${cleanVersion}`], { cwd });
        stdout = result.stdout;
        stderr = result.stderr;
      } else {
        const shellCommand = ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS];
        console.log(`[SYSTEM_UPDATE] Executing: ${shellCommand}`);
        const result = await execPromise(shellCommand, { cwd });
        stdout = result.stdout;
        stderr = result.stderr;
      }

      return NextResponse.json({
        success: true,
        stdout: translateOutput(stdout),
        stderr: translateOutput(stderr),
      });
    } finally {
      // Remover trava sempre
      if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
    }
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
