# NextWave CRM Mastery Skill

## Descrição
Esta skill contém o conhecimento especializado para manter, atualizar e expandir o NextWave CRM, focando em sua arquitetura de deploy híbrido e sistema de Web Updater.

## Regras de Ouro da Arquitetura

### 1. Docker & Volumes (Padronização Host-Container)
- **Isolamento de Build**: O Next.js deve usar o diretório `distDir: ".next_docker"`. Isso evita que pastas vazias no Windows (Host) "atropelem" o build de produção dentro do container Linux.
- **Volumes Híbridos**: No `docker-compose.yml`, a raiz `.:/app` é montada para o Git, mas `node_modules` e `.next_docker` devem ser marcados como volumes anônimos para persistir o ambiente interno do container.
- **Image Type**: Use sempre imagens "Fat" (Node Full) para permitir que o Web Updater execute `npm install` e `npm run build` em tempo de execução.

### 2. Web Updater & Git
- **Segurança de Diretório**: Todo ambiente Docker deve rodar `git config --global --add safe.directory '*'` para evitar erros de "Dubious Ownership" ao manipular o diretório no mount.
- **Locks de Atualização**: O sistema possui uma trava de arquivo (`/tmp/nextwave_update.lock`) para impedir builds simultâneos. Sempre verifique/limpe este lock em caso de erro fatal.

### 3. Banco de Dados e Resiliência
- **Build-Time Safety**: O `layout.tsx` e componentes de servidor devem lidar graciosamente com falhas de conexão do Prisma durante a build estática para não interromper o deploy.
- **Prisma Synchronization**: Use `npx prisma db push --accept-data-loss` no entrypoint para garantir que o schema esteja sempre em sincronia com o SQLite/MariaDB.

### 4. Design & Temas (Pink/Rose-light)
- **Estética Premium**: O sistema utiliza um padrão de cores HSL customizado.
- **Extensibilidade**: Novos temas devem ser adicionados ao `ColorProvider.tsx` e declarados no `SystemBranding` do banco de dados para persistência.

## Comandos Comuns de Manutenção
- `./deploy.sh`: Rebuild completo da imagem.
- `./reset-db.sh`: Limpeza do banco de dados SQLite.
- `docker compose down -v`: Necessário para resetar os volumes anônimos quando houver troca de versão de bibliotecas ou corrupção de build.

## Workflow de Atualização Manual (Em caso de falha na UI)
1. `git pull`
2. `npm install`
3. `npx prisma generate`
4. `npm run build`
5. `npm run start`
