# Guia de Backup - NextWave CRM SASS

Este documento descreve como realizar o backup do sistema de forma segura e facilitada.

## O que é incluído no Backup?

Os backups contêm os dados críticos necessários para restaurar o sistema:
1. **Banco de Dados (SQLite):** `prisma/dev.db` (Contém todos os clientes, transações e configurações).
2. **Variáveis de Ambiente:** `.env` e `.env.local` (Configurações de segurança e conexão).

---

## Método 1: Backup Automatizado (Recomendado)

Criamos um script facilitado para o Windows que faz tudo sozinho.

### Como usar:
1. Navegue até a pasta `scripts/`.
2. Dê um duplo clique no arquivo `backup.bat`.
3. O script criará uma pasta chamada `backups/` na raiz do projeto e gerará um arquivo `.zip` com a data e hora atual.

---

## Método 2: Backup Manual

Se preferir fazer manualmente, siga estes passos:

1. Crie uma cópia dos seguintes arquivos:
   - `prisma/dev.db`
   - `.env`
   - `.env.local`
2. Guarde-os em uma pasta segura (ex: `backup_hoje/`).
3. Recomenda-se compactar a pasta em um arquivo `.zip`.

---

## Frequência e Armazenamento

> [!IMPORTANT]
> **Onde guardar?**
> Não deixe seus backups apenas no mesmo computador/disco. Copie o arquivo gerado para:
> - Um Pendrive ou HD Externo.
> - Um serviço de nuvem (Google Drive, Dropbox, OneDrive) em uma conta diferente da de desenvolvimento.

> [!TIP]
> **Frequência:**
> Recomendamos fazer um backup ao final de cada dia de trabalho ou antes de realizar grandes atualizações no sistema.

---

## Como Restaurar?

Para restaurar o sistema a partir de um backup:
1. Certifique-se de que o sistema não está rodando.
2. Extraia os arquivos do seu backup `.zip`.
3. Substitua os arquivos atuais na raiz do projeto com os arquivos do backup.
4. Reinicie o sistema.
