# NextWave Architecture & UI Standards

Este documento define os padrões de desenvolvimento para manter o NextWave CRM escalável, organizado e profissional.

## 📂 Estrutura de Pastas (Página por Diretório)

Cada rota principal do dashboard deve seguir uma estrutura modular. Em vez de arquivos gigantes, separe a lógica em sub-diretórios.

### Padrão Recomendado:
```text
src/app/(dashboard)/[modulo]/
├── page.tsx          # Componente principal da página (Orquestrador)
├── layout.tsx        # Layout específico (se necessário)
└── components/       # Componentes exclusivos deste módulo
    ├── List.tsx      # Listagem de dados
    ├── Form.tsx      # Formulários de criação/edição
    └── Detail.tsx    # Visualização detalhada
```

---

## 📑 Interface por Abas (Tab-First UI)

Para módulos complexos (como Clientes ou Projetos), utilize interfaces baseadas em abas para evitar sobrecarga de informação.

### Regras de Ouro:
1. **Contexto Sempre Visível**: Mantenha um "Header" ou "Sidebar" com informações básicas (nome, status) fixas.
2. **Abas Lógicas**: Separe por categorias claras (ex: Registro, Histórico, Financeiro).
3. **Lazy Loading**: Utilize os componentes de `TabsContent` do Shadcn para manter o DOM limpo.

---

## 🎨 UI & UX Professional Standards

1. **Micro-animações**: Use `animate-in` e transições suaves em todos os modais e trocas de aba.
2. **Loading States**: Toda ação assíncrona deve ter um estado de loading visual (Skeleton ou Loader2).
3. **Null Safety**: Sempre utilize `optional chaining` (`?.`) ao renderizar dados vindos de APIs para evitar "White Screen of Death".
