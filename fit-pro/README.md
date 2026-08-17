# Fit-Pro

Plataforma fitness pessoal (treino + nutrição + histórico + evolução) para 2 usuários. Ver `FASE0_ARQUITETURA_FITPRO.md` (na raiz do repositório do projeto, entregue junto com este) para o desenho completo.

Este README cobre apenas a **Fase 1 — Fundação**.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Auth + Postgres + RLS), deploy na Vercel. Ver Fase 0, seção 3, para a justificativa completa de cada peça.

## Configuração local

1. **Instalar dependências**

   ```bash
   npm install
   ```

2. **Criar o projeto no Supabase** (supabase.com → New project).

3. **Rodar a migration** — abra o SQL Editor do projeto Supabase e execute o conteúdo de `supabase/migrations/0001_profiles.sql`.

4. **Criar as 2 contas de usuário** — Supabase → Authentication → Users → Add user (email + senha). Opcionalmente, em "User Metadata", adicione `{ "display_name": "Renan" }` para controlar o nome de exibição (senão o sistema usa o prefixo do e-mail).

5. **Variáveis de ambiente**

   ```bash
   cp .env.example .env.local
   ```

   Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores de Project Settings → API no painel do Supabase.

6. **Rodar em desenvolvimento**

   ```bash
   npm run dev
   ```

   Abra http://localhost:3000 — deve redirecionar para `/login`. Entre com uma das contas criadas no passo 4.

## Deploy na Vercel

1. Suba este repositório para o GitHub (ou GitLab/Bitbucket).
2. Na Vercel: **Add New → Project**, importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mesmos valores do `.env.local`) — marque os três ambientes (Production, Preview, Development).
4. Deploy. Cada PR/branch gera automaticamente uma URL de Preview; `main` vira Produção.

Não é necessário nenhum outro segredo — nenhuma chave `service_role` é usada neste projeto (ver Fase 0, seções 7 e 25).

## Estrutura (Fase 1)

```
app/
├─ layout.tsx              # layout raiz (dark mode fixo, fontes, viewport)
├─ page.tsx                # redireciona para /hoje (o proxy decide login vs hoje)
├─ (auth)/login/           # tela de login (Server Action)
└─ (app)/                  # rotas autenticadas
   ├─ layout.tsx           # navegação inferior + safe areas
   ├─ hoje/  treino/  nutricao/  evolucao/  mais/
lib/
├─ supabase/{client,server,middleware,types}.ts
└─ actions/auth.ts         # signOut
components/
├─ ui/                     # Button, Input, Label, Card (estilo shadcn, sem depender do CLI)
└─ shared/bottom-nav.tsx
proxy.ts                   # controle de sessão/acesso (substitui middleware.ts no Next 16)
supabase/migrations/0001_profiles.sql
```

## Como testar (critérios de aceite da Fase 1)

- [ ] `npm run build` conclui sem erros de tipo/lint.
- [ ] Acessar `/` deslogado redireciona para `/login`.
- [ ] Login com credenciais inválidas mostra "E-mail ou senha inválidos." sem quebrar a página.
- [ ] Login válido redireciona para `/hoje` e mostra o `display_name` (ou e-mail) do profile correto.
- [ ] Acessar `/treino`, `/nutricao`, `/evolucao`, `/mais` deslogado (em aba anônima) redireciona para `/login`.
- [ ] Logado, acessar `/login` diretamente redireciona de volta para `/hoje`.
- [ ] Logar com a segunda conta mostra o `display_name` da segunda conta — nunca dados da primeira (prova visual de que a RLS está isolando por usuário).
- [ ] Botão "Sair" (em `/mais`) encerra a sessão e volta para `/login`.
- [ ] Navegação inferior funciona em viewport mobile (390×844) com toque, sem sobrepor conteúdo, respeitando a safe area inferior.
- [ ] Tema é dark em toda a aplicação, sem flash de tela branca no carregamento.

## Próxima fase

Fase 2 — Estrutura de Treinos: biblioteca de exercícios, templates, importação de CSV, edição com drag-and-drop, configurações de recomendação, atividades externas, calendário. Aguardando sua confirmação desta Fase 1 antes de começar.
