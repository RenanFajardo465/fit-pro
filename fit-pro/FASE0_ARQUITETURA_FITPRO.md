# FASE 0 — Arquitetura e Planejamento
## Sistema Fitness Pessoal ("Fit-Pro") — Treino + Nutrição + Histórico + Evolução

> Documento de planejamento técnico. Nenhum código de produção, migration definitiva ou estrutura de projeto foi criada nesta etapa — apenas este documento e dois CSVs de exemplo (`csv_exemplo_treino.csv` e `csv_exemplo_dieta.csv`).

**Nota sobre os anexos:** o prompt menciona imagens de referência de UX/UI, mas nenhum arquivo de imagem chegou junto com esta mensagem (conferi a pasta de uploads da conversa e a pasta local `FIT-PRO`, ambas vazias). Todo o desenho de UX abaixo foi baseado na descrição textual detalhada que você forneceu (timeline `✓ ─ 2 ─ 3`, bloco de bi-set, cronômetro de descanso, tela detalhada do exercício, cards compactos etc.). Se você reenviar as imagens, posso revisar os pontos visuais antes de partirmos para o código.

---

## 1. Entendimento do Produto

O sistema é um app pessoal (2 usuários, esposa e você, dados 100% isolados) para gerenciar o ciclo **Planejamento → Execução → Histórico → Evolução** de treino e nutrição. O requisito mais forte do produto não é analítico — é **operacional durante o treino**: a tela usada dentro da academia precisa responder em 1 olhar "o que eu faço agora" e exigir o mínimo de toques possível (registrar carga/reps, marcar série, iniciar descanso, avançar). Tudo o que é analítico (gráficos, PRs, progressão, histórico completo) fica fora do fluxo de execução, em telas próprias de Histórico/Evolução.

Três pilares guiam todas as decisões técnicas abaixo:

1. **Integridade histórica** — nada que eu editar amanhã pode mudar o que aconteceu ontem (templates, dietas, receitas mudam; sessões e diários já registrados não).
2. **Confiabilidade em condições ruins** — tela apagada, app minimizado, wi-fi de academia instável: o treino não pode se perder nem duplicar.
3. **Simplicidade de MVP** — a arquitetura tem pontos de extensão (carga por série, novas regras de agendamento, novos tipos de exercício/métrica) mas não implementamos hoje o que só "pode ser útil no futuro".

---

## 2. Arquitetura Recomendada (visão geral)

```
┌─────────────────────────────────────────────────────────┐
│                Next.js 14+ (App Router) — Vercel          │
│                                                             │
│  Server Components (leitura inicial, SEO/perf)             │
│  Client Components (tela de treino, timers, formulários)   │
│  Route Handlers / Server Actions (import CSV, export)      │
└───────────────┬─────────────────────────────────────────┘
                │  supabase-js (anon key + RLS)
                ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase (projeto único)                │
│  Postgres (dados) · Auth (login) · Storage (não usado no    │
│  MVP, URLs externas) · Postgres Functions (import CSV atômico,│
│  cálculo de PRs)                                            │
│  Row Level Security em 100% das tabelas de usuário          │
└─────────────────────────────────────────────────────────┘
```

Não há backend próprio: o Next.js hospedado na Vercel fala diretamente com o Supabase usando a chave `anon`, protegida por RLS. As únicas operações "sensíveis" (importação de CSV, que precisa ser transacional) rodam como **Postgres Functions (RPC) `SECURITY INVOKER`** — ou seja, executam com a identidade e as permissões do próprio usuário logado, nunca com `service_role`. Isso elimina a necessidade de qualquer servidor intermediário privilegiado.

No cliente, três camadas de estado coexistem:

- **TanStack Query** — cache e sincronização dos dados vindos do Supabase (templates, histórico, biblioteca).
- **Zustand** — estado efêmero de UI e da sessão de treino em andamento (exercício atual, cronômetro de descanso local, fila de sincronização pendente).
- **IndexedDB** (via `idb-keyval`) — fila de mutações pendentes quando offline/instável, para sobreviver a reload de página.

---

## 3. Stack Recomendada e Justificativas

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Integração nativa e de primeira classe com a Vercel (mesmo criador), Server Components reduzem JS enviado ao celular, Route Handlers cobrem a necessidade de import/export sem backend separado. |
| Linguagem | **TypeScript (strict mode)** | Tipos de ponta a ponta (banco → API → UI) reduzem bugs em regras finas como bi-set, snapshot e cálculo de volume. |
| Estilo/UI | **Tailwind CSS + shadcn/ui (Radix primitives)** | Componentes acessíveis (foco, touch, ARIA) e "donos do código" (não é uma lib fechada — copiamos os componentes para o projeto e customizamos à vontade), essencial para o dark mode e para os componentes bem específicos do treino (timeline, card de exercício). |
| Formulários | **React Hook Form** | Performance em formulários com muitos campos (edição de treino, cadastro de alimento) sem re-render excessivo; ótima integração com Zod. |
| Validação | **Zod** | Um único schema serve para validar formulário no cliente, payload no servidor e cada linha do CSV importado — elimina divergência entre as três camadas. |
| Gráficos | **Recharts** | Biblioteca madura em React, responsiva, suficiente para linhas/barras de evolução de carga/volume/peso; não precisamos do poder (e da complexidade) de D3 puro. |
| Drag and drop | **dnd-kit** | Suporte a touch nativo (essencial para reordenar exercícios no celular), acessível, ativamente mantido — alternativas como `react-beautiful-dnd` estão descontinuadas. |
| Estado de servidor / cache | **TanStack Query** | Cache, revalidação em foco/reconexão, deduplicação de requisições — reduz drasticamente código manual de loading/erro. |
| Estado de UI/sessão | **Zustand** | Store simples e sem boilerplate para o que é local à tela de treino (exercício ativo, estado do cronômetro de descanso antes de persistir). |
| Persistência local | **IndexedDB via `idb-keyval`** | Fila de mutações pendentes sobrevive a reload/fechar aba, ao contrário de estado em memória; mais espaço e mais robusto que `localStorage` puro para essa finalidade. |
| Acesso ao Supabase | **`@supabase/ssr` + `supabase-js`** com tipos gerados por `supabase gen types typescript` | Sessão via cookies httpOnly (funciona em Server Components), tipagem do banco direto no cliente TS, elimina `any`. |
| Testes | **Vitest + Testing Library** (unidade/componentes) e **Playwright** (E2E dos fluxos críticos) | Vitest é rápido e já integrado ao ecossistema Vite/Next; Playwright cobre o que mais importa: iniciar treino → concluir séries → finalizar, e importar CSV. No MVP, o investimento é enxuto (ver Roadmap/Riscos) e cresce depois. |

---

## 4. Estrutura de Pastas (proposta)

```
fit-pro/
├─ app/
│  ├─ (auth)/login/
│  ├─ (app)/
│  │  ├─ hoje/                     # Dashboard
│  │  ├─ treino/
│  │  │  ├─ biblioteca/            # exercícios
│  │  │  ├─ templates/[id]/editar/
│  │  │  ├─ importar/
│  │  │  └─ sessao/[sessionId]/    # execução do treino
│  │  ├─ nutricao/
│  │  │  ├─ alimentos/
│  │  │  ├─ receitas/
│  │  │  ├─ dietas/[id]/
│  │  │  └─ importar/
│  │  ├─ historico/
│  │  ├─ evolucao/
│  │  ├─ calendario/
│  │  ├─ configuracoes/
│  │  │  ├─ recomendacao/
│  │  │  └─ atividades/
│  │  ├─ lixeira/
│  │  └─ exportar/
│  └─ api/ (Route Handlers: import, export)
├─ components/
│  ├─ ui/                          # shadcn
│  ├─ workout/                     # ExerciseCard, GroupBlock, RestTimer, Timeline...
│  ├─ nutrition/
│  └─ shared/
├─ lib/
│  ├─ supabase/ (client, server, tipos gerados)
│  ├─ schemas/ (Zod: csv-treino, csv-dieta, forms)
│  ├─ workout-engine/ (recomendação, progresso, volume, PR)
│  └─ sync/ (fila offline, idempotência)
├─ stores/ (Zustand)
├─ hooks/
└─ supabase/
   ├─ migrations/
   └─ functions/ (RPCs: import_workout_csv, import_diet_csv)
```

---

## 5. Mapa de Páginas e Navegação

Navegação principal mobile-first: **barra inferior fixa** com 5 destinos + menu "Mais".

`Hoje` (Dashboard) · `Treino` · `Nutrição` · `Evolução` · `Mais`

- **Hoje** — dashboard (seção 6).
- **Treino** — se houver sessão em andamento, abre direto nela; senão, mostra o treino recomendado/planejado de hoje com "Iniciar treino", com acesso à Biblioteca e aos Templates.
  - `treino/sessao/[sessionId]` — tela de execução (full-screen, dark, sem navegação inferior visível durante o treino, exceto o botão fixo de finalizar).
  - `treino/[templateId]` — detalhe/edição do template.
  - `treino/biblioteca` — biblioteca de exercícios.
  - `treino/importar` — fluxo de importação de CSV.
- **Nutrição** — resumo do dia + diário; sub-rotas para `alimentos`, `receitas`, `dietas`, `importar`.
- **Evolução** — histórico de sessões, gráficos por exercício, recordes, peso corporal.
- **Mais** — `calendario`, `configuracoes` (modo de recomendação, regras, atividades externas), `lixeira`, `exportar`, perfil/logout.

O calendário é acessível tanto pelo Dashboard (resumo semanal) quanto por "Mais" (visão completa navegável).

---

## 6. Modelo de Dados

Todas as tabelas de domínio têm `user_id uuid references auth.users` (RLS baseada nele) e, quando aplicável, `deleted_at timestamptz` (soft delete) e `created_at/updated_at`. Não descrevo aqui o DDL completo (isso é código de produção, fora do escopo da Fase 0) — apenas as entidades, campos-chave e relações, para validarmos o desenho antes de gerar as migrations.

### 6.1 Perfil e conta
- **profiles** — espelha `auth.users` (1:1, criado via trigger `on_auth_user_created`); nome de exibição, preferências (unidade padrão, etc).

### 6.2 Biblioteca e templates de treino
- **exercises** — nome, `muscle_group`, `category`, `metric_type` (musculacao/peso_corporal/isometrico/corrida/esteira/outro), mídia (image/gif/video URL), `deleted_at`.
- **workout_templates** — nome, código (`A`, `B`...), `deleted_at`.
- **workout_template_items** — pertence a um template; `order_index`, `group_type` (single/biset/triset/superset), `group_id`, `group_order`, `exercise_id` (nullable, `ON DELETE SET NULL`), prescrição (`sets`, `reps_min`, `reps_max`, `duration_target_seconds`, `distance_target_meters`, `rest_seconds`, `technique`, `notes`, `initial_load_kg`).

### 6.3 Agendamento e recomendação
- **schedule_settings** — modo ativo do usuário (`sequence` / `weekday` / `rules`).
- **sequence_state** — para o Modo 1: `last_completed_template_id`, `last_completed_at` (usado para calcular "o próximo da fila").
- **weekday_assignments** — para o Modo 2: `weekday` (0–6), `template_id` nullable (nulo = descanso).
- **schedule_rules** — para o Modo 3: `rule_type` (enum extensível: `avoid_template_on_weekday`, `avoid_muscle_group_after_activity`, `reserve_rest_day`, `prioritize_template_on_weekday`, ...) + `params jsonb`. Motor genérico, mas no MVP só implementamos os 3–4 tipos de regra citados no seu prompt (ver seção 26, decisão pendente).
- **manual_overrides** — `date`, `template_id` — força um treino específico numa data, sempre com prioridade máxima na resolução (seção 12).
- **external_activities** — nome, `weekday` ou `date` específica, horário, duração estimada, observação; aparecem no calendário e podem alimentar regras do Modo 3.

### 6.4 Sessão de treino (execução)
- **workout_sessions** — `template_id` (nullable, `SET NULL`), **snapshot** de `template_name`, `date`, `started_at`, `finished_at`, `status` (`in_progress`/`completed`/`abandoned`).
- **session_exercises** — snapshot de cada item do template no momento de iniciar: `exercise_id` (nullable), `exercise_name`, `muscle_group`, `metric_type`, `order_index`, `group_type`, `group_id`, `group_order`, prescrição completa, `general_load_kg` (a carga geral da sessão, editável).
- **session_sets** — `session_exercise_id`, `set_number`, `status` (`pending`/`completed`/`skipped`), `weight_kg` (copiado da carga geral no momento da conclusão — já preparado para futura edição individual, ver seção 6.7), `reps`, `duration_seconds`, `distance_meters`, `completed_at`, `client_id` (uuid gerado no cliente, chave de idempotência — seção 11).
- **session_group_rest** — estado do descanso por agrupamento/exercício: `session_id`, `group_key` (group_id ou exercise_id quando single), `round_number`, `rest_started_at`, `rest_ends_at`, `paused_remaining_seconds`.

### 6.5 Evolução
- **personal_records** — `exercise_id`, `record_type` (`max_load`/`max_reps_at_load`/`max_set_volume`/`max_exercise_volume`), `value`, `achieved_at`, `session_set_id` de origem. Recomendo popular via **view/consulta**, não trigger (seção 17), então esta tabela pode inclusive ser substituída por uma view materializada leve — decisão final na implementação.
- **body_weight_logs** — `date`, `weight_kg`, `note`.

### 6.6 Nutrição
- **foods** — nome, marca opcional, porção de referência, unidade, `grams_equivalent`, macros por porção, `deleted_at`.
- **recipes** / **recipe_items** — receita composta por alimentos + quantidade; `servings`, macros calculados e **congelados** (`computed_calories` etc. gravados na receita, recalculados só quando o usuário edita e salva).
- **diet_templates** — nome, código, `diet_type`, `deleted_at`.
- **diet_meals** / **diet_meal_items** — estrutura planejada (refeição, horário, alimentos, quantidades planejadas).
- **diet_days** — snapshot: quando o usuário seleciona uma dieta para uma data, cria-se um `diet_days` com `diet_template_id` (nullable) + `diet_name` snapshot.
- **diet_day_meals** / **diet_day_items** — snapshot dos itens planejados daquele dia (nome do alimento, quantidade planejada, macros planejadas) **+** campos de consumo (`consumed_quantity`, `consumed_at`, macros recalculadas proporcionalmente).
- **extra_food_logs** — itens adicionados fora da dieta num dia (`diet_day_id`, alimento/receita, quantidade, macros), não alteram o template original.

### 6.7 Sistema
- **csv_import_batches** — auditoria de importações (arquivo, contagem de linhas, erros, status, timestamp).

Todas as tabelas de "biblioteca/template" (exercises, workout_templates, foods, recipes, diet_templates) são referenciadas pelas tabelas de execução por **FK nullable com `ON DELETE SET NULL`**, nunca `CASCADE` — é isso que garante que apagar/editar não quebra o histórico (seção 8).

**Sobre carga por série (item 31 do seu prompt):** `session_sets` já nasce com uma coluna própria `weight_kg` por linha — hoje ela é sempre preenchida com o valor de `general_load_kg` da sessão no momento em que a série é concluída, e a UI só mostra/edita a carga geral. Quando quisermos permitir carga individual por série, é uma mudança **só de UI** (liberar edição do campo `weight_kg` daquela série específica); nenhuma migration ou reconstrução de histórico será necessária.

---

## 7. Estratégia de RLS

Padrão único aplicado a toda tabela de usuário: RLS habilitada + policy usando `auth.uid()`.

```sql
alter table public.workout_sessions enable row level security;

create policy "own rows only"
on public.workout_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

O mesmo padrão (`select/insert/update/delete` restritos a `auth.uid() = user_id`) se repete em todas as ~20 tabelas de domínio. Tabelas "filhas" sem `user_id` próprio (ex.: `session_sets`, que só tem `session_exercise_id`) recebem uma policy via subquery/join até a tabela-mãe que tem `user_id`, ou — mais simples e performático — também carregam uma coluna `user_id` denormalizada (preenchida por trigger/default a partir da sessão pai), evitando joins em toda policy. Recomendo essa segunda abordagem para as tabelas mais "quentes" (`session_sets`, `session_exercises`, `diet_day_items`).

Não há usuário "admin" nem necessidade de bypass de RLS: a própria importação de CSV roda como Postgres Function `SECURITY INVOKER`, então continua sujeita à RLS do usuário que a chamou. Isso significa **nenhuma chave privilegiada (`service_role`) trafega no navegador nem é necessária no servidor** para este MVP.

Sem usuário autenticado nunca há acesso — não há telas públicas nem dados de demonstração.

---

## 8. Estratégia de Snapshot (Preservação Histórica)

Ponto crítico do produto. Estratégia: **cópia denormalizada no momento do evento + desacoplamento de FK**.

- Ao clicar "Iniciar treino", o sistema lê o `workout_template` atual e **copia** cada campo relevante para `session_exercises`/`session_sets`. A partir daí, a sessão nunca mais consulta o template para exibir prescrição — só guarda `template_id` como referência informativa (nullable).
- O mesmo vale para nutrição: selecionar uma dieta para o dia cria `diet_days`/`diet_day_meals`/`diet_day_items` como cópia da `diet_template` naquele instante.
- Receitas usadas num `diet_day_item` também congelam seus macros calculados no momento do uso (não recalculam se a receita for editada depois).
- Todas as FKs de "execução → biblioteca/template" são `nullable` com `ON DELETE SET NULL`: apagar (ou soft-deletar) um exercício, template, alimento ou receita **nunca** apaga nem corrompe uma sessão/diário antigo, porque o antigo já tem seus próprios dados copiados.

Não usamos versionamento formal (ex.: `template_versions` com número de versão) porque, para 2 usuários e o volume de edições esperado, o snapshot simples é mais fácil de implementar, entender e consultar — versionamento formal só valeria a pena se precisássemos comparar "sessão X rodou na versão 3 do template", o que não é um requisito atual.

---

## 9. Estratégia de Soft Delete

Coluna `deleted_at timestamptz null` nas tabelas: `workout_templates`, `exercises`, `diet_templates`, `foods`, `recipes`.

- Toda consulta "normal" filtra `deleted_at is null` (via view ou simplesmente na query padrão do client).
- Tela **Lixeira** lista `deleted_at is not null`, com ações "Restaurar" (`deleted_at = null`) e "Excluir definitivamente" (`delete` físico).
- Como o snapshot (seção 8) já desacoplou tudo que é histórico, a exclusão definitiva de um item na lixeira é **sempre segura** — não existe cenário em que apagar um `exercise` fisicamente quebre uma sessão antiga, pois `session_exercises.exercise_id` vira `null` automaticamente e os dados (`exercise_name` etc.) continuam lá.
- Itens soft-deletados somem das buscas/seletores de novos treinos e dietas, mas continuam existindo para exibição de histórico antigo que ainda referencie o `id` (antes de o `SET NULL` acontecer, no caso de exclusão definitiva).

---

## 10. Sessão Ativa, Recuperação e Sessão Esquecida

- Apenas **uma sessão `in_progress` por usuário** é permitida — garantido por um índice único parcial: `create unique index one_active_session_per_user on workout_sessions (user_id) where status = 'in_progress'`. Isso também é o que possibilita a tela "Você possui um treino em andamento" de forma trivial: basta essa query.
- Ao abrir o app, se existir sessão `in_progress`, mostramos o card de recuperação antes de qualquer outra coisa relacionada a treino, com **Continuar** (abre a sessão, reconstrói o tempo a partir de `started_at`) ou **Abandonar** (`status = 'abandoned'`, `finished_at = now()`).
- **Treino esquecido:** proponho o limite padrão de **4 horas** desde `started_at`, ou **qualquer sessão iniciada em um dia de calendário anterior ao atual** (o que vier primeiro) para disparar o alerta "Este treino foi iniciado há X horas. Deseja realmente continuar?". Nunca encerramos automaticamente — o usuário decide entre Continuar/Abandonar. Esse limite é configurável depois; 4h cobre folgas normais (almoço, deslocamento) sem deixar passar um esquecimento óbvio de um dia para o outro.

---

## 11. Internet Instável — Autosave, Sync, Anti-duplicação, Status de Salvamento

Não implementamos app offline-first completo (não é o requisito) — implementamos **resiliência a instabilidade temporária** durante o treino:

1. Toda ação do usuário na tela de treino (concluir série, mudar carga, dar play no descanso) **atualiza o estado local (Zustand) imediatamente** — a UI nunca espera a rede.
2. Em paralelo, a ação é empilhada numa **fila de sincronização em IndexedDB**, com um `client_id` (UUID v4) gerado no momento da criação do registro.
3. Um worker simples (efeito React + listeners `online`/`offline` + retry com backoff exponencial) drena a fila para o Supabase usando **`upsert` por `client_id`** (chave única em `session_sets` e nas demais tabelas de eventos de sessão) — isso é o que evita duplicação: reenviar a mesma mutação depois de uma queda de conexão simplesmente sobrescreve o mesmo registro, nunca cria um novo.
4. Se a aba for fechada/recarregada com itens pendentes na fila, ao reabrir o app a fila é lida do IndexedDB e a sincronização continua de onde parou — nada se perde silenciosamente.
5. **Status de salvamento**, exibido discretamente (texto pequeno, sem popups):
   - `✓ Salvo` — fila vazia e último envio confirmado.
   - `Salvando...` — envio em andamento.
   - `Sem conexão — alterações pendentes` — navegador offline (evento `offline` ou falha de rede) com itens na fila.
   - `Erro ao salvar — tentando novamente` — falhas repetidas de servidor (não de rede) com retry ativo.

---

## 12. Motor de Recomendação de Treino

Resolução em ordem de prioridade, para uma data `D`:

1. **`manual_overrides`** para `D`? Usa esse template. Prioridade máxima, sempre.
2. **`schedule_rules`** (Modo 3) — se o modo ativo do usuário for "regras", aplica os filtros (evitar treino/grupo muscular X em `D`, respeitar dias de descanso reservados, priorizar treino Y em `D`) sobre o resultado do passo 3 antes de sugerir.
3. Resolução conforme o **modo base**:
   - **Modo 1 (sequência contínua):** próximo da fila = o item seguinte a `sequence_state.last_completed_template_id` na ordem cadastrada dos templates. **Só avança quando uma sessão é `completed`** (nunca por `abandoned`, nem por passagem de dias/calendário) — se a última concluída foi Treino A na segunda, e o usuário só treina de novo na quinta, a recomendação de quinta continua sendo Treino B, exatamente como especificado.
   - **Modo 2 (por dia da semana):** olha `weekday_assignments` para o dia da semana de `D` diretamente (pode ser um template ou "descanso").
4. Se nada resolver, mostra "Nenhum treino planejado para hoje" com atalho para escolher manualmente.

O motor é uma função pura `resolveWorkoutForDate(date, userState) → templateId | 'rest' | null`, testável isoladamente (bom candidato a teste unitário desde o início).

---

## 13. Execução do Treino

- **Exercício atual:** `workout_sessions.active_exercise_id` (nullable). Ao concluir a última série/rodada pendente do exercício/agrupamento atual, o sistema avança automaticamente para o próximo pendente (por `order_index`). O usuário pode a qualquer momento tocar em outro exercício pendente na lista para torná-lo o atual — não há ordem obrigatória, apenas uma sugestão.
- **Série atual:** derivada, não armazenada — é sempre a primeira `session_set` com `status = 'pending'` daquele `session_exercise` (ou, num agrupamento, a rodada corrente — seção 14).
- **Carga geral:** `session_exercises.general_load_kg`, sugerida automaticamente com a última carga registrada para aquele exercício (consulta à sessão anterior mais recente que tenha esse `exercise_id`), editável em input numérico (teclado numérico no mobile), sem steppers de +/-2,5kg conforme pedido.
- **Repetições por série:** input numérico por série, dentro da tela detalhada do exercício.
- **Preservação de scroll:** a lista principal permanece montada; a tela detalhada do exercício abre como rota sobreposta (`intercepting route` do App Router ou modal full-screen), então o scroll da lista nunca é perdido ao voltar. Como reforço, a posição de scroll é guardada em `sessionStorage` por `sessionId`.
- **Botão "Ir para exercício atual":** um `IntersectionObserver` monitora se o card do exercício atual está visível; quando sai da viewport, exibe o FAB; ao tocar, `scrollIntoView({behavior:'smooth', block:'center'})`. Posicionado para nunca sobrepor o botão fixo de Finalizar (ex.: FAB acima do rodapé, com margem de segurança).
- **Compactação:** card muda de estado visual (`completed`) quando todas as séries/rodadas terminam, mostrando resumo de uma linha; continua clicável para reabrir os detalhes.

---

## 14. Agrupamentos: Bi-set, Tri-set e Superset

Modelagem única para os três (tri-set e superset diferem só na intenção/nome, tecnicamente idênticos a "N exercícios agrupados"): `group_type` + `group_id` compartilhado entre `session_exercises`.

- **Rodada corrente do grupo** = `min(quantidade de séries concluídas)` entre os exercícios do grupo, `+1`. Ou seja, se A tem 2 séries concluídas e B tem 1, a rodada corrente é a 2 (B ainda precisa terminar a rodada 1... na prática, cada exercício avança sua própria série, e "rodada concluída" só é considerada quando **todos** os exercícios do grupo têm uma série concluída naquele índice).
- **Timeline única:** renderizada a partir da rodada corrente do grupo (não de cada exercício individualmente), exatamente como pedido — internamente os dados continuam por `session_set` de cada exercício.
- **Checks individuais:** cada exercício do bloco mostra seu próprio check ao concluir sua série da rodada; nenhum contador "1 de 2" é exibido, só os checks.
- **Descanso único:** uma linha em `session_group_rest` por `(session_id, group_key, round_number)` — `group_key` é o `group_id` (ou `exercise_id`, para exercícios avulsos, unificando o mesmo mecanismo de timer para todos os casos). O botão Play só aparece quando a rodada inteira (todos os exercícios do grupo) é concluída.
- **Carga individual:** cada `session_exercise` do grupo mantém seu próprio `general_load_kg` — não existe carga compartilhada do bloco.

---

## 15. Cronômetros

- **Geral do treino:** nunca pausa. `started_at` é gravado uma vez; a duração exibida é `now() - started_at` recalculada no cliente a cada tick (1x/segundo), mas a fonte da verdade é sempre `started_at`/`finished_at` do servidor — mesmo se a aba for fechada e reaberta 40 minutos depois, a duração exibida ao reabrir já nasce correta.
- **Descanso:** ao tocar Play, gravamos `rest_started_at = now()` e `rest_ends_at = now() + rest_seconds` (mais ajustes de +15s/+30s somados a `rest_ends_at`). Tempo restante = `rest_ends_at - now()`, sempre recalculado (nunca um `setInterval` que apenas decrementa uma variável em memória, que se perderia ao trocar de app). Pausar grava `paused_remaining_seconds` e zera `rest_ends_at`; retomar recalcula `rest_ends_at = now() + paused_remaining_seconds`. Se o usuário volta depois do fim, mostramos "Descanso concluído" (tempo restante nunca é exibido negativo — `Math.max(0, restante)`), sem reiniciar automaticamente.

---

## 16. Séries Puladas

Ao finalizar o treino com pendências, o usuário confirma "Finalizar mesmo assim" → toda `session_set` ainda `pending` daquela sessão vira `status = 'skipped'` (não é apagada). Séries `skipped` permanecem visíveis no histórico (mostrando o que era planejado), mas são **excluídas** de: cálculo de volume, verificação de recordes e sugestão de progressão — todas essas consultas filtram `status = 'completed'`.

---

## 17. Cálculos: Progresso, Volume, PR, Progressão

- **Progresso geral:** `séries completed / total de séries prescritas` (contando cada série de cada exercício individualmente, inclusive dentro de agrupamentos — um bi-set 3×2 exercícios conta como 6 séries no denominador).
- **Volume:** `Σ (weight_kg × reps)` por série `completed`, somado por exercício e depois por treino — só para `metric_type` compatível (musculação, peso corporal com carga adicional). Tipos incompatíveis (isométrico, corrida, esteira) não entram nessa soma — não inventamos um "volume" para eles.
- **Recordes pessoais (PR):** calculados via **view/consulta** (não trigger), agregando `session_sets.completed` por `exercise_id`: maior carga, maior repetição numa dada carga, maior volume de uma série, maior volume do exercício numa sessão. Optar por view em vez de trigger simplifica o MVP (sem lógica incremental para manter consistente) — o custo de recalcular é irrelevante no volume de dados de 2 usuários. Séries de treinos `abandoned` participam normalmente, desde que `status = 'completed'`.
- **Sugestão de progressão de carga:** regra simples — ao abrir um exercício, comparamos os `reps` de **todas** as séries `completed` da última sessão em que ele apareceu contra `reps_max` prescrito; só sugerimos "Considere aumentar a carga" se **todas** baterem o topo da faixa. Nunca altera a carga automaticamente.

---

## 18. Tipos de Métrica

`session_sets` usa colunas tipadas e nulináveis (`weight_kg`, `reps`, `duration_seconds`, `distance_meters`) em vez de um único JSON — mantém queries de volume/PR simples em SQL puro. Cada `metric_type` define quais colunas são relevantes:

| metric_type | campos usados |
|---|---|
| musculacao | weight_kg, reps |
| peso_corporal | reps (+ weight_kg opcional, carga adicional) |
| isometrico | duration_seconds |
| corrida | duration_seconds, distance_meters |
| esteira | duration_seconds, distance_meters (+ velocidade opcional, futuro) |

Para tipos futuros que precisem de um campo fora desse conjunto sem exigir migration imediata, deixamos uma coluna extra `extra_metrics jsonb null` — não usada por nenhum tipo hoje, disponível como válvula de escape.

---

## 19. Nutrição

- **Biblioteca de alimentos:** CRUD simples com busca por nome (índice trigram/`ilike`), reutilizável entre dietas/receitas.
- **Receitas:** soma dos itens (alimento × quantidade) dividida pelo rendimento (`servings`) define a porção; macros calculados no momento de salvar e **congelados** na receita (recalculados apenas quando o usuário edita e salva de novo) — assim, um `diet_day_item` que referenciou a receita antiga não muda se a receita for editada depois.
- **Diário do dia (`diet_days`):** criado ao selecionar manualmente uma dieta para a data; cópia integral da dieta (refeições, horários, alimentos, quantidades planejadas). Checklist por alimento e por refeição inteira; alteração de quantidade consumida recalcula macros proporcionalmente (`macros_planejados × consumido/planejado`).
- **Itens extra:** `extra_food_logs` vinculados ao `diet_day`, não tocam a dieta original — pode ser alimento da biblioteca, alimento personalizado ou receita.
- **Resumo do Dashboard:** apenas calorias (`consumido/meta`), proteína (`consumido/meta`) e contagem `X de Y itens consumidos`, com barras simples — carboidrato/gordura ficam de fora do Dashboard e aparecem completos na tela de Nutrição.
- **Histórico:** cada `diet_day` e seus itens já são o próprio histórico (snapshot), então "olhar o passado" é só consultar por data — nenhuma dependência do estado atual da dieta/receita.

---

## 20. CSV de Treino — Formato Oficial

### 20.1 Colunas

| Coluna | Obrigatória | Tipo | Descrição / valores permitidos |
|---|---|---|---|
| `workout_code` | Sim | texto curto | Código do treino (ex.: `A`, `B`, `PERNA1`). Mesmo código em todas as linhas do mesmo treino. |
| `workout_name` | Sim | texto | Nome de exibição do treino. Igual em todas as linhas do mesmo `workout_code`. |
| `exercise_order` | Sim | inteiro ≥ 1 | Ordem do **bloco** (exercício avulso ou agrupamento) dentro do treino. Linhas do mesmo agrupamento repetem o mesmo número. |
| `group_type` | Sim | enum | `single`, `biset`, `triset`, `superset`. |
| `group_id` | Condicional | texto curto | Obrigatório se `group_type ≠ single`. Identifica as linhas que formam o mesmo bloco (ex.: `G1`). Vazio quando `single`. |
| `group_order` | Condicional | inteiro ≥ 1 | Obrigatório se `group_type ≠ single`. Posição do exercício dentro do bloco (1, 2, 3...). Vazio quando `single`. |
| `exercise_name` | Sim | texto | Nome do exercício. |
| `muscle_group` | Sim | enum | `peito`, `costas`, `ombro`, `biceps`, `triceps`, `perna`, `gluteo`, `abdomen`, `cardio`, `corpo_inteiro`, `outro`. |
| `category` | Não | texto | Livre (ex.: `composto`, `isolado`). |
| `exercise_type` | Sim | enum | `musculacao`, `peso_corporal`, `isometrico`, `corrida`, `esteira`, `outro`. |
| `sets` | Sim | inteiro ≥ 1 | Número de séries (ou rodadas, se agrupado). |
| `reps_min` | Condicional | inteiro ≥ 0 | Obrigatório se `exercise_type` ∈ {musculacao, peso_corporal}. |
| `reps_max` | Condicional | inteiro ≥ `reps_min` | Idem. |
| `initial_load_kg` | Não | decimal ≥ 0 | Carga inicial sugerida. Só faz sentido para musculacao/peso_corporal. |
| `duration_target_seconds` | Condicional | inteiro ≥ 1 | Obrigatório se `exercise_type` ∈ {isometrico, corrida, esteira}. |
| `distance_target_meters` | Condicional | decimal ≥ 0 | Obrigatório se `exercise_type` ∈ {corrida, esteira}. |
| `unit` | Não | enum | `kg` (unidade da carga; hoje só `kg` é suportado — coluna existe para permitir `lb` no futuro sem migration). |
| `rest_seconds` | Sim | inteiro ≥ 0 | Descanso após a série/rodada. |
| `technique` | Não | enum | `normal`, `dropset`, `restpause`, `cluster`, `isometria_final`, `outro`. |
| `notes` | Não | texto | Observações livres. |
| `image_url` | Não | URL | — |
| `gif_url` | Não | URL | — |
| `video_url` | Não | URL | — |

### 20.2 Regras

1. Codificação **UTF-8**, separador **vírgula**, primeira linha = cabeçalho exatamente com os nomes acima.
2. Todas as linhas de um mesmo `workout_code` devem repetir o mesmo `workout_name`.
3. Dentro de um mesmo `exercise_order`, todas as linhas devem ter o mesmo `group_type` e o mesmo `group_id`.
4. `group_order` dentro de um `group_id` deve ser sequencial começando em 1, sem lacunas nem repetição (1, 2, 3...).
5. `group_type = single` nunca deve vir acompanhado de outra linha com o mesmo `exercise_order`.
6. `group_type ∈ {biset}` exige exatamente 2 linhas no mesmo `group_id`; `triset` e `superset` exigem 3 ou mais.
7. Campos condicionais (marcados "Condicional" na tabela) são validados de acordo com o `exercise_type` daquela linha — ausência quando obrigatório é **erro bloqueante**; presença quando não se aplica é **aviso** (não bloqueia).
8. `group_id` só precisa ser único **dentro do mesmo `workout_code`** (pode repetir `G1` em treinos diferentes).

### 20.3 Exemplos

**Válido** (linha avulsa): `A,Treino A,1,single,,,Supino Reto Barra,peito,composto,musculacao,3,8,10,40,,,kg,90,normal,,,,`

**Válido** (bi-set, 2 linhas com mesmo `exercise_order`/`group_id`, `group_order` 1 e 2).

**Inválido:** `group_type=biset` com `group_id` vazio → erro "group_id obrigatório para agrupamentos". `exercise_type=corrida` sem `distance_target_meters` → erro "distância alvo obrigatória para corrida". `reps_min=10, reps_max=8` → erro "reps_max deve ser ≥ reps_min".

### 20.4 CSV completo de exemplo

Arquivo `csv_exemplo_treino.csv` (entregue junto com este documento) — Treino A com exercício avulso, um bi-set (ombro), um tri-set (peito/peito/flexão de peso corporal), isométrico (prancha) e esteira, cobrindo todos os tipos de métrica e agrupamento.

---

## 21. CSV de Dieta — Formato Oficial

### 21.1 Colunas

| Coluna | Obrigatória | Tipo | Descrição / valores permitidos |
|---|---|---|---|
| `diet_name` | Sim | texto | Nome de exibição da dieta. |
| `diet_code` | Sim | texto curto | Código único da dieta (ex.: `TREINO_A`). |
| `diet_type` | Sim | enum | `treino`, `descanso`, `futebol`, `muay_thai`, `treino_atividade`, `personalizado`. |
| `meal_name` | Sim | texto | Nome da refeição (ex.: `Café da manhã`). |
| `meal_order` | Sim | inteiro ≥ 1 | Ordem da refeição no dia. |
| `meal_time` | Não | `HH:MM` | Horário sugerido. |
| `item_order` | Sim | inteiro ≥ 1 | Ordem do alimento dentro da refeição. |
| `food_name` | Sim | texto | Nome do alimento. |
| `quantity` | Sim | decimal > 0 | Quantidade na unidade informada. |
| `unit` | Sim | enum | `g`, `kg`, `ml`, `L`, `unidade`, `fatia`, `colher`, `colher_cha`, `colher_sopa`, `xicara`, `porcao`, `scoop`, `pacote`. |
| `grams_equivalent` | Sim | decimal > 0 | Gramas (ou ml, se líquido) usados para o cálculo nutricional daquela quantidade. |
| `calories` | Sim | decimal ≥ 0 | Calorias totais da quantidade informada (já multiplicada, não por 100g). |
| `protein_g` | Sim | decimal ≥ 0 | Idem, proteína. |
| `carbs_g` | Sim | decimal ≥ 0 | Idem, carboidrato. |
| `fat_g` | Sim | decimal ≥ 0 | Idem, gordura. |
| `notes` | Não | texto | Observações livres. |

### 21.2 Regras

1. UTF-8, separador vírgula, cabeçalho exato.
2. Todas as linhas do mesmo `diet_code` repetem o mesmo `diet_name`/`diet_type`.
3. `meal_order` deve ser consistente para o mesmo `meal_name` dentro da mesma dieta (mesmo nome de refeição não pode aparecer com ordens diferentes).
4. `item_order` sequencial dentro de cada refeição, começando em 1.
5. Os valores de `calories`/`protein_g`/`carbs_g`/`fat_g` são os **totais já calculados** para a `quantity` informada (o agente de IA que gera o CSV faz essa conta; o sistema não recalcula a partir de "por 100g").

### 21.3 CSV completo de exemplo

Arquivo `csv_exemplo_dieta.csv` (entregue junto com este documento) — "Dieta Treino" com 5 refeições e 13 itens. *Os valores nutricionais são ilustrativos (aproximados), não conferidos contra uma tabela nutricional oficial — sirva como modelo de formato, não como referência nutricional.*

---

## 22. Validação dos CSVs (fluxo de importação)

1. **Selecionar CSV** → leitura client-side com **PapaParse**.
2. **Validar estrutura**: cabeçalho bate exatamente com o esperado (nomes e ordem das colunas, ou ao menos presença de todas as colunas obrigatórias).
3. **Validar linhas**: cada linha passa por um schema **Zod** (o mesmo schema documentado nas seções 20/21), com `superRefine` para as regras condicionais (campo obrigatório conforme `exercise_type`/etc.).
4. **Validação cruzada**: consistência de agrupamento (`group_order` sequencial, `group_type` uniforme no grupo, tamanho mínimo de bi-set/tri-set), consistência de `workout_name`/`diet_name` por código.
5. **Prévia**: tela mostra os blocos de exercícios/refeições como ficariam (mesma visual da tela de treino/dieta), antes de confirmar.
6. **Erros × Avisos**: erros bloqueiam a importação (botão Confirmar desabilitado); avisos (ex.: mídia ausente, campo não aplicável preenchido) são exibidos mas não bloqueiam.
7. **Confirmar → Importar**: chama uma **Postgres Function transacional** (`import_workout_csv` / `import_diet_csv`, `SECURITY INVOKER`) que recebe o payload já validado (JSON) e insere tudo dentro de uma única transação — se qualquer linha falhar na inserção (ex.: violação de constraint que passou despercebida), a transação inteira faz rollback e nada fica parcialmente importado.

---

## 23. Estratégia de Exportação

Dois formatos, mesmo conteúdo:

- **JSON** — um único bundle por usuário, estruturado por domínio (`workouts`, `sessions`, `personal_records`, `body_weight`, `diets`, `diet_days`, `nutrition_summary`), com `export_version` e `generated_at` no topo. Pensado para ser consumido por agentes de IA depois (nomes de campo estáveis, iguais às colunas do banco, sem abreviações obscuras).
- **CSV** — um arquivo por entidade (sessões, séries, volume por sessão, PRs, peso corporal, diário nutricional), zipados juntos para download único.

Gerado sob demanda via Route Handler que consulta o Supabase com o token do próprio usuário (sujeito a RLS) e monta os arquivos em memória — sem necessidade de job assíncrono no volume de dados de 2 pessoas.

---

## 24. Deploy na Vercel

- **Ambientes:** `local` (`.env.local`, projeto Supabase de desenvolvimento ou o mesmo projeto com cuidado), **Preview** (cada PR/branch gera uma URL própria na Vercel) e **Produção** (branch principal).
- **Variáveis de ambiente** (Vercel → Settings → Environment Variables, uma por ambiente):
  - `NEXT_PUBLIC_SUPABASE_URL` — pública, ok expor.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pública, protegida por RLS, ok expor.
  - Nenhuma `service_role` é necessária neste MVP (seção 7/22) — se algum dia for preciso, ela **jamais** leva o prefixo `NEXT_PUBLIC_` e só é lida em Route Handlers/Server Actions.
- **Projeto Supabase único**, usado tanto por Preview quanto Produção no MVP (2 usuários, sem necessidade de isolar dados de teste) — ressalva na seção 26 (decisão aberta) caso você prefira um projeto separado para testes de importação de CSV.
- **Build:** padrão Next.js na Vercel, sem configuração especial; tipos do Supabase gerados localmente e commitados (evita depender da CLI do Supabase no build da Vercel).

---

## 25. Segurança

- RLS em 100% das tabelas de usuário (seção 7); nunca confiar em filtro de front-end.
- `service_role` nunca chega ao navegador; import de CSV roda `SECURITY INVOKER`.
- Validação de entrada com Zod tanto no cliente (feedback imediato) quanto implicitamente no banco (constraints/checks nas colunas — ex.: `reps_max >= reps_min`, enums via `check` ou tipo `enum` do Postgres).
- Sessão de autenticação via cookies `httpOnly` (`@supabase/ssr`), não `localStorage` — reduz superfície a XSS.
- Campos de texto livre (`notes`) renderizados pelo React por padrão já escapam HTML — sem `dangerouslySetInnerHTML` em conteúdo de usuário.
- Sem cadastro público (seção 26 — decisão pendente sobre como as 2 contas são criadas).

---

## 26. Roadmap de Desenvolvimento

Mantida a organização proposta por você, com pequenos ajustes de sequenciamento interno:

**Fase 1 — Fundação:** projeto Next.js + Tailwind + shadcn, Supabase (projeto, Auth, `profiles`, RLS base), layout mobile-first com navegação inferior, deploy inicial na Vercel.

**Fase 2 — Estrutura de Treinos:** biblioteca de exercícios, templates (CRUD), importação de CSV de treino (com todo o fluxo de validação), edição com drag-and-drop, configurações de recomendação (3 modos), atividades externas, calendário.

**Fase 3 — Execução do Treino:** sessão + snapshot, recuperação/sessão esquecida, autosave/fila offline, exercício e série atuais, carga geral, timeline, bi-set/tri-set/superset, cronômetros (geral e descanso), séries puladas, finalização e resumo.

**Fase 4 — Evolução:** histórico, cálculo de volume, PRs, gráficos por exercício, sugestão de progressão, peso corporal.

**Fase 5 — Nutrição:** alimentos, receitas, dietas, importação de CSV de dieta, duplicação de dieta, diário/checklist, planejado × consumido, itens extra, resumo e histórico nutricional.

**Fase 6 — Exportação:** CSV e JSON.

**Fase 7 — Refinamento:** UX, performance, responsividade, acessibilidade, loading/empty states, tratamento de erros, testes E2E dos fluxos críticos, revisão de segurança.

---

## 27. Riscos Técnicos e Trade-offs

- **Timers em produto web (não app nativo):** mesmo reconstruindo tudo a partir de `started_at`/`rest_ends_at`, o navegador pode suspender JS em background em alguns celulares/economia de bateria — mitigado porque a UI sempre recalcula a partir do timestamp do servidor ao voltar ao primeiro plano, nunca depende do timer ter "rodado" enquanto minimizado.
- **Drag-and-drop touch:** `dnd-kit` é sólido, mas reordenar listas longas em telas pequenas exige testes reais em dispositivo (não só emulador) antes de considerar pronto.
- **RLS mal configurada é o risco de maior impacto** do projeto (vazamento de dados entre você e sua esposa) — mitigação: testar explicitamente com 2 contas reais que cada policy bloqueia acesso cruzado, antes de qualquer dado real entrar no sistema.
- **PRs via view vs. trigger:** view é mais simples agora; se o histórico crescer muito (anos de dados), pode valer migrar para tabela materializada/trigger — não é uma preocupação para o volume atual.
- **CSV sem número de versão do formato:** se o formato evoluir (novas colunas), CSVs antigos gerados por agentes de IA podem ficar desalinhados — mitigação simples: documentar a versão atual (v1) neste próprio documento e tratar mudanças de coluna como uma migração de "prompt para os agentes", nunca quebrando compatibilidade sem aviso.
- **Escopo do Modo 3 (regras):** um motor de regras genérico pode crescer sem limite — mitigamos implementando só os 3–4 tipos de regra citados no MVP, com o `rule_type` + `jsonb` já preparado para novos tipos sem migration.

---

## 28. Decisões que Preciso Tomar

### 1. Limite de "treino esquecido"
**Contexto:** seção 10 propõe alertar quando a sessão está aberta há muito tempo.
**Recomendação:** 4 horas desde `started_at`, OU virada de dia — o que ocorrer primeiro.
**Alternativas:** limite fixo maior (6–8h) para acomodar treinos duplos/atividades longas; limite configurável por usuário desde já.
**Impacto:** baixo e reversível — é só uma constante, mas prefiro confirmar com você antes de fixar.

### 2. Como as 2 contas são criadas
**Contexto:** o sistema não terá cadastro público nem painel admin (item 2 do seu prompt).
**Recomendação:** criar as 2 contas manualmente pelo painel do Supabase (Auth → Add user) antes do primeiro deploy; sem tela de "criar conta" no app, só login.
**Alternativas:** tela de login com "esqueci minha senha" via magic link/e-mail; ou um convite único por link gerado manualmente.
**Impacto:** afeta a tela de login (com ou sem opção de recuperação de senha) e o processo de onboarding das duas contas.

### 3. Regras do Modo 3 a implementar no MVP
**Contexto:** seção 6.3/27 — motor genérico, mas MVP deve conter só um subconjunto.
**Recomendação:** implementar os 4 tipos citados por você: não realizar treino X em dia Y; evitar grupo muscular após atividade específica; reservar dia de descanso; priorizar treino X em dia Y.
**Alternativas:** começar só com 2 (evitar treino em dia / reservar descanso) e adicionar os outros na Fase 2 se o tempo apertar.
**Impacto:** médio — afeta a complexidade da tela de configurações e do motor de resolução (seção 12).

### 4. Projeto Supabase único vs. separado para Preview/testes
**Contexto:** seção 24 — Preview e Produção usando o mesmo projeto Supabase.
**Recomendação:** projeto único (simplicidade, 2 usuários reais, sem necessidade de dados de teste separados).
**Alternativas:** projeto Supabase separado para testar importações de CSV sem risco de sujar dados reais.
**Impacto:** baixo agora, mas trocar depois exige migrar dados — melhor decidir antes do primeiro deploy real.

### 5. Unidade de carga (kg vs. libras)
**Contexto:** CSV e telas usam `kg` fixo no MVP; a coluna `unit` já existe para o futuro.
**Recomendação:** manter só `kg` no MVP (mercado brasileiro, seu caso de uso).
**Alternativas:** suportar `kg`/`lb` com conversão desde já.
**Impacto:** baixo e reversível.

### 6. Profundidade de testes automatizados no MVP
**Contexto:** seção 3/27 — Vitest + Playwright previstos, mas quanto investir agora vs. depois.
**Recomendação:** unitário para o motor de recomendação, cálculo de volume/PR e validação de CSV (lógica pura, alto risco de regressão silenciosa) + 1 teste E2E Playwright cobrindo "iniciar treino → concluir série → finalizar"; deixar cobertura mais ampla para a Fase 7.
**Alternativas:** pular testes automatizados no MVP inteiro e confiar em teste manual (mais rápido agora, mais arriscado conforme o app cresce).
**Impacto:** médio — tempo de desenvolvimento agora vs. velocidade segura de mudanças depois.

---

## Anexo A — Confirmações após revisão das imagens de referência

Você enviou 3 telas de referência (2 delas duplicadas): tela detalhada de exercício, lista de execução com um bloco de bi-set, e dashboard. Confronto com o que foi desenhado nas seções acima:

**Confirmado, sem mudança de arquitetura:**
- Tela do exercício (imagem 1): imagem grande no topo, dois "chips" lado a lado (Séries/Repetições e Carga com ícone de edição), linha de descanso com timeline `✓─2─3` logo abaixo, seções colapsáveis "Evolução de carga" e "Minhas anotações" — confirma a seção 25 tal como desenhada.
- Bloco de bi-set (imagens 2/3): cabeçalho com ícone de link + "Bi-set" + ícone de informação, dois exercícios com prescrição individual (`3×6-10 | X kg`), uma única timeline, um único descanso — confirma as seções 14 e 36-41.
- Botão de descanso mostra ▶ (play) quando ainda não iniciado e um ícone de check/áudio quando em andamento — confirma as seções 15 e 34.
- Botão "Finalizar treino" fixo no rodapé mesmo com a lista rolando — confirma a seção 45.
- Dashboard: card do treino do dia com grupo muscular/duração/nº de exercícios, estatísticas do período, navegação inferior — alinhado com a seção 6.

**Ponto identificado, decisão registrada:** na imagem do bi-set aparece **um único checkbox** compartilhado pelos dois exercícios do bloco, enquanto o item 38 do seu prompt original pede "cada exercício possui seu próprio indicador/check". Mantivemos a decisão pelo texto original: **2 checks individuais e compactos**, um por exercício dentro do bloco (mais informativo durante a execução — dá pra ver qual dos dois já foi feito no meio da rodada). Se você preferir replicar exatamente a imagem (1 checkbox cobrindo os dois), é só avisar antes da Fase 3.

**Dois elementos da referência fora do escopo original, com decisão proposta:**
- **Alerta sonoro ao final do descanso** (ícone de speaker na imagem): não estava no prompt original, mas é barato de implementar e serve diretamente à meta de "abrir → executar → registrar → descansar → avançar" sem precisar olhar a tela toda hora. **Incluído por padrão** no MVP (Fase 3), com opção de mudo por sessão — avise se preferir deixar de fora.
- **Streak/sequência de semanas e botão "Renove seu treino"** (dashboard): isso é gamificação e geração automática de programa — no seu produto os treinos vêm prontos de agentes de IA via CSV, então "renovar" não se aplica do mesmo jeito. **Deixado fora do MVP** por padrão, seguindo o princípio de dashboard enxuto (itens 6 e 82). Se quiser um contador de sequência de treinos concluídos mais simples no futuro, é uma adição pequena e isolada.

---

Ao aprovar esta Fase 0 (ou pedir ajustes), seguimos para a Fase 1 conforme o processo que você descreveu: por etapa, com objetivo, dependências, decisões técnicas, SQL, código, caminhos de arquivo, comandos, variáveis de ambiente, critérios de aceite — aguardando sua confirmação antes de cada próxima fase.
