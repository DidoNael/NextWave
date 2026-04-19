# Guia de Deploy: Do Local para o Servidor

Siga os passos abaixo para colocar o seu sistema no ar com todos os dados migrados.

## 1. No Servidor (Linux)
Acesse seu servidor via SSH e execute:

### A. Clonar o código
```bash
git clone https://github.com/DidoNael/NextWave.git
cd NextWave
```

### B. Configurar o ambiente
Crie o arquivo `.env` no servidor:
```bash
nano .env
```
Copie o conteúdo do seu `.env` local para este arquivo, mas certifique-se de que a `NEXTAUTH_URL` seja o seu domínio real:
`NEXTAUTH_URL=https://crm.netstream.net.br`

### C. Iniciar os Containers
```bash
docker-compose up -d --build
```

---

## 2. Transferindo os Dados (O Banco de Dados)
Agora que o sistema está rodando no servidor, precisamos levar os dados do seu computador local para lá.

### A. Transferir o arquivo de Dump
Do seu computador local (onde está o `backups/postgres_dump.sql`), use o comando SCP para enviar ao servidor:
```powershell
# No PowerShell local:
scp backups/postgres_dump.sql usuario@ip-do-servidor:~/NextWave/backups/
```

### B. Restaurar os dados no Servidor
Com o arquivo já no servidor, execute o comando para importar tudo:
```bash
# No terminal do Servidor:
cat ~/NextWave/backups/postgres_dump.sql | docker exec -i nextwave-db psql -U root
```

---

## 3. Verificação Final local
Acesse seu domínio no navegador e tente fazer login.
Todos os clientes, faturas e transações que foram migrados do seu SQLite agora estarão visíveis no PostgreSQL do seu servidor!

> [!TIP]
> O usuário do banco de dados é **root** e a senha é **Q2aw3@se4dr5**.
