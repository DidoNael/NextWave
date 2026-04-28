# 🚀 Guia Mestre de Instalação - NextWave CRM v2.0.5

Este guia contém os passos exatos para colocar o seu CRM online, desde o `git clone` até o primeiro acesso.

---

## 📋 Pré-requisitos
Antes de começar, certifique-se de ter instalado:
- **Git**
- **Docker & Docker Compose**
- **Rede Docker `nginx`** (Criar com: `docker network create nginx`)
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

1. Acesse: **`http://localhost:3010/setup`**
2. O sistema detectará o ambiente novo.
3. Preencha o formulário:
   - **Banco de Dados**: Deixe as configurações padrão se estiver no Docker (host: `nextwave-db`, user: `root`).
   - **Módulos**: Escolha os módulos desejados (incluindo o WhatsApp).
   - **Suas Senhas**: Defina sua senha de administrador e a nova senha secreta do banco.
4. Clique em **"Finalizar Instalação"**.

### ✅ Tudo Pronto!
O sistema vai configurar automaticamente:
- O seu arquivo `.env` com todas as chaves de segurança necessárias.
- A senha do banco de dados para a sua escolha privada.
- **WhatsApp**: Gerará uma chave API única e aleatória para a sua Evolution API.

---
## 🛡️ Configuração de Proxy Reverso (Nginx)
Para maior segurança, o sistema vem configurado para aceitar conexões apenas via Nginx (localhost).

1. **Rede Nginx**: Certifique-se de que a rede `nginx` existe antes de subir o docker:
   ```bash
   docker network create nginx
   ```

2. **Configuração Nginx**: Aponte o `proxy_pass` para `http://127.0.0.1:3010`.

3. **Portas**: As portas 3010 e 8081 estão bloqueadas para acesso externo direto (bind no 127.0.0.1). Todo acesso deve passar pelo seu domínio configurado no Nginx.

---
## 🔄 Solução de Problemas e Reset

### Esqueci a senha ou quero refazer o Wizard
Se você precisar rodar o Wizard de configuração novamente sem apagar todo o banco de dados, você pode apenas "limpar" os usuários. Isso fará o sistema entender que é uma nova instalação:

```bash
# Rodar no terminal da sua VPS
docker exec -it nextwave-db psql -h localhost -U root -d nextwave_crm -c "TRUNCATE TABLE \"User\" CASCADE;"
```

### O sistema não redireciona para o Setup
Certifique-se de que o volume `nextwave-setup` foi limpo se você estiver tentando uma instalação do zero absoluta:
```bash
docker compose down -v
```

---
> [!TIP]
> **Segurança Máxima (v3.0.49)**: Este sistema foi sanitizado. Nenhuma senha ou chave de API está "vazada" ou hardcoded no código. Todas as credenciais são geradas de forma aleatória e privada durante o seu Setup.
