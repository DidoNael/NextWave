"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// SVG icon — lightning bolt filled with currentColor (primary)
function NextWaveIcon({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M38 4L14 36h18l-6 24 38-32H46L54 4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [totpCode, setTotpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<LoginFormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmitCredentials = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const preLogin = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const preLoginData = await preLogin.json();

      if (!preLogin.ok) {
        toast.error(preLoginData.error || "Email ou senha incorretos");
        return;
      }

      if (preLoginData.requires2FA) {
        setSavedCredentials(data);
        setStep("totp");
        toast.info("Autenticação de dois fatores necessária");
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!result?.error) {
        toast.success("Login realizado com sucesso!");
        router.push("/");
        router.refresh();
      } else {
        toast.error("Erro ao autenticar. Tente novamente.");
      }
    } catch (e: unknown) {
      console.error("Login exception:", e);
      toast.error("Erro ao realizar login.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitTotp = async () => {
    if (!savedCredentials) return;
    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/2fa/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: savedCredentials.email, token: totpCode }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toast.error(verifyData.error || "Código inválido");
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: savedCredentials.email,
        password: savedCredentials.password,
        twoFactorCode: totpCode,
        redirect: false,
      });

      if (!result?.error) {
        if (trustDevice) {
          await fetch("/api/auth/trusted-device", { method: "POST" });
        }
        toast.success("Acesso concedido!");
        router.push("/");
        router.refresh();
      } else {
        toast.error("Falha na autenticação final.");
      }
    } catch (error) {
      console.error("TOTP Verification Error:", error);
      toast.error("Erro na verificação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-background relative flex-col justify-center items-center p-12 overflow-hidden border-r border-border">
        {/* Animated glow blob */}
        <div
          className="absolute w-[480px] h-[480px] bg-primary/5 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
          aria-hidden="true"
        />
        <div
          className="absolute w-[280px] h-[280px] bg-primary/10 blur-3xl rounded-full top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Large icon */}
          <div className="text-primary mb-6">
            <NextWaveIcon size={64} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            NextWave CRM
          </h1>
          <p className="text-muted-foreground text-lg mb-10">
            Gestão inteligente para o seu negócio
          </p>

          {/* Feature bullets */}
          <ul className="space-y-4 w-full text-left">
            {[
              "Segurança enterprise",
              "Automação WhatsApp",
              "Relatórios em tempo real",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 7l3.5 3.5L12 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-foreground/80 text-sm font-medium">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* Form card */}
          <div className="rounded-2xl border border-border bg-background shadow-lg p-8">
            {/* Logo row */}
            <div className="flex items-center gap-3 mb-8">
              <div className="text-primary">
                <NextWaveIcon size={32} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight text-foreground">
                  NextWave CRM
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  Sistema de Gestão
                </span>
              </div>
            </div>

            {step === "credentials" ? (
              <>
                {/* Title */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    Bem-vindo de volta
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Insira suas credenciais para acessar o sistema
                  </p>
                </div>

                {/* Credentials form */}
                <form
                  onSubmit={handleSubmit(onSubmitCredentials)}
                  className="space-y-5"
                  noValidate
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="bg-muted border-border rounded-xl h-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="bg-muted border-border rounded-xl h-11 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground rounded-xl w-full h-11 font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <>
                {/* Title */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">
                      Verificação 2FA
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Insira o código de 6 dígitos do seu app autenticador
                  </p>
                </div>

                {/* TOTP form */}
                <div className="space-y-5">
                  {/* Code input — centered & large */}
                  <div className="flex justify-center">
                    <Input
                      className="text-center text-3xl h-16 w-48 bg-muted border-border rounded-xl font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      value={totpCode}
                      onChange={(e) =>
                        setTotpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                    />
                  </div>

                  {/* Trust device */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">
                      Confiar neste dispositivo
                    </span>
                  </label>

                  {/* Confirm */}
                  <Button
                    onClick={onSubmitTotp}
                    disabled={isLoading || totpCode.length < 6}
                    className="bg-primary text-primary-foreground rounded-xl w-full h-11 font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verificando...
                      </>
                    ) : (
                      "Confirmar Acesso"
                    )}
                  </Button>

                  {/* Back */}
                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setStep("credentials")}
                    disabled={isLoading}
                  >
                    Voltar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
