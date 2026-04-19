"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [totpCode, setTotpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<LoginFormValues | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
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
    } catch (e: any) {
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
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-center items-center p-12">
        <Zap className="h-20 w-20 text-white mb-6" />
        <h1 className="text-4xl font-bold">NextWave CRM</h1>
        <p className="text-blue-100 mt-4">Gestão inteligente e segura para seu negócio.</p>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {step === "credentials" ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Acesso ao Sistema</CardTitle>
                <CardDescription className="text-slate-400">Insira suas credenciais para continuar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmitCredentials)} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input {...register("email")} className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Senha</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        className="bg-slate-800 border-slate-700 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Entrando...</> : "Entrar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  Código 2FA
                </CardTitle>
                <CardDescription className="text-slate-400">Insira o código de 6 dígitos do seu app autenticador</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  className="text-center text-2xl h-14 bg-slate-800 border-slate-700 text-white font-mono"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={trustDevice} onChange={e => setTrustDevice(e.target.checked)} />
                  Confiar neste dispositivo
                </label>
                <Button onClick={onSubmitTotp} className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading || totpCode.length < 6}>
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando...</> : "Confirmar Acesso"}
                </Button>
                <Button variant="ghost" className="w-full text-slate-400" onClick={() => setStep("credentials")} disabled={isLoading}>Voltar</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
