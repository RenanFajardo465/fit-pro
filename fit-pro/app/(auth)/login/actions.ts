"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Login por e-mail/senha. Não existe cadastro público (Fase 0, seção 28,
 * decisão 2) — as contas são criadas manualmente no painel do Supabase.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Informe e-mail e senha.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Fase 1 (app privado, 2 usuários): mostramos o motivo real em vez de um
    // genérico "credenciais inválidas" — isso não é uma boa prática para um
    // produto público (ajuda quem tenta adivinhar e-mails cadastrados), mas
    // aqui vale mais poder autodiagnosticar problemas de configuração do
    // Supabase rapidamente. Reavaliar antes de qualquer exposição pública.
    const message =
      error.code === "email_not_confirmed"
        ? "Este e-mail ainda não foi confirmado no Supabase. Vá em Authentication → Users, abra o usuário e confirme o e-mail (ou recrie marcando 'Auto Confirm User')."
        : error.code === "invalid_credentials"
          ? "E-mail ou senha incorretos (confira espaços extras ao copiar/colar a senha)."
          : `Erro ao entrar: ${error.message} (code: ${error.code ?? "desconhecido"})`;

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/hoje");
}
