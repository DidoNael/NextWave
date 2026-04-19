# 🚀 Guia Mestre de Instalação - NextWave CRM v2.0.5

Este guia contém os passos exatos para colocar o seu CRM online, desde o `git clone` até o primeiro acesso.

---

## 📋 Pré-requisitos
Antes de começar, certifique-se de ter instalado:
- **Git**
- **Docker & Docker Compose**
- **Node.js v20 ou superior**

---

## 🛠️ Passo 1: Clonagem e Preparação
Abra o seu terminal e execute:

```bash
# 1. Clone o repositório
git clone https://github.com/DidoNael/NextWave.git
cd NextWave

# 2. Prepare o arquivo de ambiente
cp .env.example .env
```

> **Instalação Automática**: Você **não precisa** editar nenhum arquivo agora. Basta copiar o `.env.example` para `.env` e rodar o sistema. O CRM solicitará suas senhas no navegador (Passo 4).

---

## 🛠️ Passo 2: Subindo o CRM (Docker)
Agora, vamos subir toda a plataforma de uma só vez:

```bash
docker-compose up -d
```
*Isso vai iniciar o Banco de Dados (PostgreSQL) e o CRM automaticamente. Nenhuma configuração prévia é necessária.*

---

## 🚀 Passo 3: Configuração Final (Setup Wizard)
Acesse o seu navegador para finalizar a instalação:

1. Acesse: **`http://localhost:3000/setup`**
2. O sistema detectará o ambiente novo.
3. Preencha o formulário:
   - **Banco de Dados**: Deixe as configurações padrão se estiver no Docker (host: `nextwave-db`, user: `root`).
   - **Sua Senha**: Escolha aqui a senha que você deseja usar.
4. Clique em **"Finalizar Instalação"**.

### ✅ Tudo Pronto!
O sistema vai configurar automaticamente o seu arquivo `.env`, mudará a senha do banco de dados para a sua escolha e reiniciará pronto para uso.

---
> [!TIP]
> **Privacidade**: As chaves de segurança (NextAuth) e a senha do banco agora são geradas e configuradas automaticamente pelo Wizard para sua comodidade.
