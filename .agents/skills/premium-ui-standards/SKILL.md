# Premium UI & Development Standards Skill

## Descrição
Esta skill define os padrões visuais e de código para garantir que o NextWave CRM mantenha uma interface "World Class" (nível mundial), com estética premium, animações fluidas e código limpo.

## Identidade Visual (Rose-light / Pink)

### 1. Paleta de Cores e Tokens
- **Tema de Destaque**: O padrão atual é o `Rose-light` (Rosa elegante).
- **HSL Tokens**:
  - `pink`: Core primary para botões e estados ativos.
  - `rose`: Variação elegante para backgrounds e gradientes.
- **Gradientes**: Use sempre `@apply bg-gradient-to-br from-primary to-primary/80` para botões principais para dar profundidade.

### 2. Tipografia e Espaçamento
- **Filtro de Fonte**: Preferência por fontes sans-serif modernas (Inter/Outfit).
- **Consistência**: Use `tracking-tight` em títulos para um visual mais denso e profissional.
- **Headers**: Títulos de seção devem ser `text-2xl font-bold` com uma descrição `text-muted-foreground` logo abaixo.

## Padrões de Componentes (Shadcn/UI)

### 1. Botões e Interatividade
- **Micro-animações**: Todos os botões interativos devem ter os utilitários CSS `hover-lift` ou `press-effect`.
- **Estados de Carregamento**: Nunca deixe o usuário esperando sem feedback. Use a prop `loading` do componente `Button` customizado.
- **Radius**: O padrão é `rounded-lg` (0.75rem), exceto quando o `data-layout='professional'` estiver ativo (bordas quadradas).

### 2. Cards e Feedback
- **Glassmorphism**: Use `bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm` em modais e cards suspensos para um efeito premium.
- **Empty States**: Sempre use ilustrações sutis (Lucide Icons) e textos centralizados quando não houver dados.

## Padrões de Desenvolvimento Profissional

### 1. Estrutura de Código
- **Atomic Components**: Mantenha lógica de negócio fora dos componentes de UI puros (pastas `components/ui` vs `components/dashboard`).
- **Server Components**: Use Next.js Server Components por padrão. Só use `"use client"` quando houver necessidade de `state` ou `effects`.

### 2. UX de "Um Clique"
- **Simplificação**: Se uma tarefa exige 3 passos, crie uma função ou botão que automatize os 3 (ex: Botão "Atualização Completa").
- **Toasts**: Informe sempre o resultado de operações de background usando `sonner` (`toast.success` ou `toast.error`).

### 3. Clean Code & Git
- **Commits**: Mensagens claras seguindo o padrão Conventional Commits (ex: `feat:`, `fix:`, `chore:`).
- **Zero Placeholders**: Nunca use imagens de exemplo ou textos "Lorem Ipsum". Gere assets reais.
