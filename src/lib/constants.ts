/**
 * NextWave CRM - Central de Configuração Local Master
 * Todas as referências de versão e metadados do sistema devem ser lidas deste arquivo.
 */

export const SYSTEM_INFO = {
    version: "3.0.0",
    releaseName: "NextWave CRM SASS Master",
    buildDate: "2026-04-20",
    securityGateway: "Active",
    author: "DidoNael / Antigravity",
    repo: "https://github.com/DidoNael/NextWave"
};

export const DATABASE_DEFAULTS = {
    factoryPassword: "Q2aw3@se4dr5", // Senha de fábrica compatível com o ambiente Docker
    defaultPort: "5432",
    defaultHost: "db", // Host padrão do docker-compose
    defaultUser: "root",
    defaultDatabase: "nextwave_crm"
};
