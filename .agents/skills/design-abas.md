---
name: design-abas
description: Padrão visual de design para Tabs (Abas) na aplicação.
---

# Padrão de Design para Abas (Tabs)

## Estilo Visual
As abas do sistema NextWave CRM SASS devem seguir um design flat e minimalista (sem "pills" ou backgrounds coloridos de fundo para a aba inativa), muito semelhante aos padrões modernos do Material ou de e-commerces. 

### Regras do `TabsList` (O contêiner das abas)
- Fundo transparente: `bg-transparent`.
- Borda horizontal inteiriça inferior servindo de linha de base: `border-b border-border`.
- O container deve abranger 100% da largura, com conteúdo alinhado à esquerda (`w-full justify-start`).

### Regras do `TabsTrigger` (Cada botão de aba)
- Os itens não devem ter padding de fundo para destacar (sem `bg-muted` ou `data-[state=active]:shadow`).
- O texto das abas inativas é discreto: `text-muted-foreground`.
- O hover clareia ou realça o título inativo para o forte: `hover:text-foreground`.
- **Estado Ativo**: A aba ativa deve ser identificada não por background mas sim por cor de texto e um **sublinhado** forte na base.
- Classes Tailwinds a aplicar no *state=active*: `data-[state=active]:border-primary data-[state=active]:text-foreground`.
- Para o sublinhado, usar `border-b-2 border-transparent` no estado natural, preenchendo o `border-primary` e usando margem negativa inferior `-mb-[1px]` ou similar para sobrepor a borda do layout `TabsList`.

## Uso
Para renderizar novas abas no formulário (exemplo: Cadastro de Produtos, Configurações de Cliente), sempre re-utilize a raiz em `src/components/ui/tabs.tsx`. Como o padrão global Shadcn Ui foi atualizado para este arquivo, o simples uso de compilação renderizará as abas seguindo este estilo automaticamente em light e dark modes. 
