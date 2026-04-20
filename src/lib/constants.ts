/**
 * NextWave CRM - Central de Configuração Local Master
 * Todas as referências de versão e metadados do sistema devem ser lidas deste arquivo.
 */

export const SYSTEM_INFO = {
    version: "3.0.3",
    releaseName: "NextWave CRM SASS Master",
    buildDate: "2026-04-20",
    securityGateway: "Active",
    author: "DidoNael / Antigravity",
    repo: "https://github.com/DidoNael/NextWave"
};

export const DATABASE_DEFAULTS = {
    factoryPassword: "NW_MASTER_KEY_2026_BYPASS_INIT", // Chave de ativação principal
    factoryFallbacks: ["nextwave_setup_2026", "Q2aw3@se4dr5", "root", "password"], // Chaves históricas para compatibilidade
    defaultPort: "5432",
    defaultHost: "db",
    defaultUser: "root",
    defaultDatabase: "nextwave_crm"
};
