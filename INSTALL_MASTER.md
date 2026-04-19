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

> [!IMPORTANT]
> Edite o arquivo `.env` e altere as chaves `NEXTAUTH_SECRET` e `AUTH_SECRET` para valores aleatórios e seguros.

---

## 🐘 Passo 2: Subindo a Infraestrutura (Banco de Dados)
O NextWave v2.0.5 exige **PostgreSQL**. Vamos subir o banco de dados oficial via Docker:

```bash
docker-compose up -d
```
*Isso vai iniciar o PostgreSQL (nextwave-db) e a Evolution API automaticamente no Docker.*

---

## 🚀 Passo 3: Iniciando a Aplicação

### Opção A: Modo Desenvolvimento (Local)
Se você quer rodar o sistema no seu computador para testes:

```bash
# Instale as dependências
npm install

# Gere o cliente do Banco de Dados
npx prisma generate

# Inicie o sistema
npm run dev
```
Acesse: [http://localhost:3000](http://localhost:3000)

### Opção B: Modo Produção (Docker)
Se você for subir no servidor oficial com Traefik:

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

---

## 🪄 Passo 4: Configuração Final (Setup Wizard)
Uma vez que o sistema estiver rodando, o NextWave entrará em modo de instalação automática.

1. Acesse: **`http://localhost:3000/setup`** (ou o IP do seu servidor)
2. O sistema detectará que o banco de dados ainda não foi configurado.
3. Preencha os dados de conexão que definimos no Docker padrão:
   - **Host**: `localhost` (ou `nextwave-db` se estiver usando Docker para o CRM também)
   - **Porta**: `5432`
   - **Usuário**: `root`
   - **Senha**: `Q2aw3@se4dr5`
   - **Banco**: `nextwave_crm`
4. Clique em **"Testar Conexão"** e, após o sucesso, clique em **"Finalizar Instalação"**.

---

## ✅ Pronto!
O sistema reiniciará já configurado e você poderá criar a sua primeira organização e o seu usuário administrador.

---
> [!TIP]
> **Segurança**: Como agora o histórico do seu Git está limpo (v2.0.5), mantenha seus dados sensíveis apenas nos arquivos `.env` locais.
