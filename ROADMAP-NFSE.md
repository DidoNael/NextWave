# Roadmap — Módulo NFS-e (Ginfes / Guarulhos)

## ✅ Implementado

- Configuração fiscal (CNPJ, inscrição municipal, alíquota ISS, item lista serviço)
- Upload e armazenamento criptografado do certificado digital (.pfx) + senha (AES-256-GCM)
- Emissão de NFS-e via SOAP `RecepcionarLoteRpsV3`
- Consulta de situação do lote via protocolo (`ConsultarSituacaoLoteRpsV3`)
- Cancelamento de NFS-e emitida (`CancelarNfseV3`)
- Rastreamento de cada nota (NfseRecord: RPS, número, protocolo, status, XML)
- Botão "Emitir NFS-e" na tela de detalhe do serviço com pré-preenchimento do cliente
- Histórico de notas na página de configuração

---

## 🔧 Essenciais (em andamento)

### 1. Retry de notas com erro
- [ ] Botão "Retentar" em notas com status `erro`
- [ ] API `POST /api/nfse/[id]/retry` que reenvia com os mesmos dados
- [ ] Incrementa o número RPS para evitar duplicata

### 2. Visualizador de XML
- [ ] Modal com duas abas: "XML Enviado" e "XML Retorno"
- [ ] Formatação/indentação do XML para leitura
- [ ] Disponível em qualquer nota no histórico

### 3. Download da NFS-e (PDF)
- [ ] Link para o portal Ginfes usando `codigoVerificacao`
- [ ] Botão "Ver NFS-e" em notas emitidas
- [ ] URL: `https://guarulhos.ginfes.com.br/report/consultarNota?chave={codigo}`

### 4. Email automático para o tomador
- [ ] Ao confirmar emissão (status → `emitida`), enviar email ao tomador
- [ ] Email contém: número da nota, valor, link para visualização
- [ ] Usa configuração SMTP existente do sistema
- [ ] Opcional: desabilitar por configuração

---

## 📅 Automação

### 5. Polling automático de status
- [ ] Após emitir, verificar protocolo a cada 30s automaticamente
- [ ] Para quando status for `emitida`, `cancelada` ou `erro`
- [ ] Toast de notificação ao confirmar

### 6. Emissão automática ao concluir serviço
- [ ] Ao mudar status do serviço para "concluído", perguntar se deseja emitir NFS-e
- [ ] Pré-preencher dados automaticamente
- [ ] Configurável: pode ser desabilitado

### 7. Faturamento em lote mensal
- [ ] Tarefa agendada (`nfe_batch`) no dia de cobrança configurado
- [ ] Emite NFS-e para todas as assinaturas ativas com `billingFrequency = mensal`
- [ ] Relatório de lote: quantas emitidas, erros, valor total

---

## 🔗 Integração com o sistema

### 8. NFS-e na ficha do cliente
- [ ] Nova aba "NFS-e" no perfil do cliente
- [ ] Lista todas as notas emitidas para aquele tomador
- [ ] KPIs: total emitido no ano, última nota

### 9. ISS por retenção configurável
- [ ] Campo "ISS Retido" por serviço ou por cliente
- [ ] Default global configurável (hoje fixo como "não retido")
- [ ] Impacto no cálculo do valor líquido

### 10. Código de serviço por categoria
- [ ] Mapeamento: categoria do serviço → item da lista de serviço
- [ ] Ex: "Infraestrutura" → 14.06, "Consultoria" → 17.01
- [ ] Fallback para o código global quando não mapeado

---

## 📊 Dashboard e relatórios

### 11. Dashboard NFS-e
- [ ] Cards: notas emitidas no mês, valor total, pendentes, erros
- [ ] Gráfico mensal de emissões
- [ ] Alerta de certificado próximo do vencimento

### 12. Exportação para contabilidade
- [ ] Export CSV/Excel com todas as notas do período
- [ ] Campos: número, data, tomador, CNPJ, valor, ISS, status

---

## 🔒 Segurança avançada

### 13. Verificação de vencimento do certificado
- [ ] Ao carregar o .pfx, extrair e salvar a data de validade
- [ ] Alerta no dashboard X dias antes do vencimento
- [ ] Email automático ao admin quando faltar 30 dias

### 14. Auditoria de emissões
- [ ] Log de quem emitiu/cancelou cada nota
- [ ] Armazenar IP e usuário em cada operação
