import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const modules = [
    { key: 'clientes', name: 'Clientes', description: 'Gestão completa de base de clientes' },
    { key: 'financeiro', name: 'Financeiro', description: 'Controle de receitas, despesas e faturamento' },
    { key: 'projetos', name: 'Projetos', description: 'Gestão de projetos e tarefas (Kanban)' },
    { key: 'servicos', name: 'Serviços', description: 'Acompanhamento de ordens de serviço' },
    { key: 'agenda', name: 'Agenda', description: 'Calendário de compromissos e reuniões' },
    { key: 'usuarios', name: 'Usuários', description: 'Gestão de acessos e permissões' },
    { key: 'whatsapp', name: 'WhatsApp Chat', description: 'Comunicação integrada via WhatsApp', enabled: false },
];

async function main() {
    console.log('Iniciando inicialização de módulos...');

    for (const mod of modules) {
        await prisma.systemModule.upsert({
            where: { key: mod.key },
            update: {},
            create: mod,
        });
        console.log(`Módulo '${mod.name}' verificado/criado.`);
    }

    console.log('Inicialização concluída!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
