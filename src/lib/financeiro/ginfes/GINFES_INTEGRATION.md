# GINFES NFS-e — Regras de Integração (Guarulhos v3)

> **Documento vivo** — atualizado à medida que novos comportamentos são identificados via testes contra o servidor de produção do GINFES Guarulhos.
> Última atualização: 2026-04-29

---

## Status Atual dos Testes

| Erro | Significado | Status |
|------|-------------|--------|
| E185 | Estrutura do cabeçalho (`arg0`) inválida | ✅ **Resolvido** |
| E160 | Payload (`arg1`) fora do schema XSD | ✅ **Resolvido** |
| E302 | Assinatura digital inválida | ✅ **Resolvido** |


---

## 1. SOAP Envelope — Estrutura do `arg0` (Cabeçalho)

### ✅ Estrutura que funciona (sem E185)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <ns1:RecepcionarLoteRpsV3 xmlns:ns1="http://producao.ginfes.com.br">
      <arg0>
        <ns2:cabecalho versao="3" xmlns:ns2="http://www.ginfes.com.br/cabecalho_v03.xsd">
          <versaoDados>3</versaoDados>
        </ns2:cabecalho>
      </arg0>
      <arg1>
        <!-- payload XML direto, sem escape -->
      </arg1>
    </ns1:RecepcionarLoteRpsV3>
  </soapenv:Body>
</soapenv:Envelope>
```

### ❌ Estruturas que NÃO funcionam

**Strings escapadas dentro de `arg0`/`arg1`:**
```xml
<!-- ERRADO — causa E185 -->
<arg0 xmlns="">&lt;cabecalho xmlns="..."&gt;...&lt;/cabecalho&gt;</arg0>
```

**Cabecalho sem prefixo de namespace:**
```xml
<!-- ERRADO — causa E185 -->
<arg0>
  <cabecalho xmlns="http://www.ginfes.com.br/cabecalho_v03.xsd" versao="3">
    <versaoDados>3</versaoDados>
  </cabecalho>
</arg0>
```

### Regras críticas do `arg0`
1. `arg0` deve conter **XML real** (nós DOM), não strings escapadas
2. O `cabecalho` **deve** usar prefixo `ns2:` com namespace declarado inline
3. `versao="3"` (inteiro, não `"3.00"`)
4. `<versaoDados>3</versaoDados>` (sem decimais)
5. O namespace do `ns1:RecepcionarLoteRpsV3` define o ambiente:
   - Produção: `http://producao.ginfes.com.br`
   - Homologação: `http://homologacao.ginfes.com.br`

---

## 2. Payload XML (`arg1`) — Estrutura do `EnviarLoteRpsEnvio`

### ✅ Estrutura que funciona (sem E160)

O `arg1` deve conter o `EnviarLoteRpsEnvio` **completo**, gerado diretamente pelo template:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio
  xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd"
  xmlns:tipos="http://www.ginfes.com.br/tipos_v03.xsd">

  <LoteRps Id="lote{LOTE_ID}">
    <tipos:NumeroLote>{LOTE_ID}</tipos:NumeroLote>
    <tipos:Cnpj>{CNPJ_PRESTADOR}</tipos:Cnpj>
    <tipos:InscricaoMunicipal>{IM_PRESTADOR}</tipos:InscricaoMunicipal>
    <tipos:QuantidadeRps>{N}</tipos:QuantidadeRps>
    <tipos:ListaRps>
      <!-- tipos:Rps aqui -->
    </tipos:ListaRps>
  </LoteRps>

</EnviarLoteRpsEnvio>
```

### Regras críticas do payload
1. `EnviarLoteRpsEnvio` é gerado **no template** (não no `emitirLote` do client)
2. `LoteRps` **não** usa prefixo `tipos:` — é `<LoteRps Id=...>`, não `<tipos:LoteRps ...>`
3. Dentro do `LoteRps`, todos os filhos usam prefixo `tipos:`
4. O namespace padrão `xmlns="..."` no `EnviarLoteRpsEnvio` define o schema XSD do serviço

---

## 3. Estrutura do `tipos:Rps` (por RPS)

```xml
<tipos:Rps>
  <tipos:InfRps Id="rps{NUMERO}">
    <!-- SEM atributo versao — não usar versao="3.00" -->
    <tipos:IdentificacaoRps>
      <tipos:Numero>{NUMERO}</tipos:Numero>
      <tipos:Serie>{SERIE}</tipos:Serie>
      <tipos:Tipo>{TIPO}</tipos:Tipo>
    </tipos:IdentificacaoRps>
    <tipos:DataEmissao>{YYYY-MM-DDTHH:mm:ss}</tipos:DataEmissao>
    <tipos:NaturezaOperacao>{1-6}</tipos:NaturezaOperacao>
    <!-- RegimeEspecialTributacao apenas se !== '' -->
    <tipos:OptanteSimplesNacional>{1 ou 2}</tipos:OptanteSimplesNacional>
    <tipos:IncentivadorCultural>{1 ou 2}</tipos:IncentivadorCultural>
    <tipos:Status>1</tipos:Status>
    <tipos:Servico>
      <tipos:Valores>
        <tipos:ValorServicos>{X.XX}</tipos:ValorServicos>
        <tipos:IssRetido>{1 ou 2}</tipos:IssRetido>
        <tipos:BaseCalculo>{X.XX}</tipos:BaseCalculo>
        <tipos:Aliquota>{X.XXXX}</tipos:Aliquota>
        <!-- NÃO incluir ValorDeducoes, ValorPis, etc. — causam E160 -->
      </tipos:Valores>
      <tipos:ItemListaServico>{ex: 1.07}</tipos:ItemListaServico>
      <!-- CodigoTributacaoMunicipio: apenas se fornecido -->
      <tipos:Discriminacao>{texto}</tipos:Discriminacao>
      <tipos:CodigoMunicipio>{IBGE}</tipos:CodigoMunicipio>
      <!-- NÃO incluir ExigibilidadeISS aqui — vai dentro de Valores no XSD v3 -->
    </tipos:Servico>
    <tipos:Prestador>
      <tipos:Cnpj>{14 dígitos}</tipos:Cnpj>
      <tipos:InscricaoMunicipal>{só dígitos}</tipos:InscricaoMunicipal>
    </tipos:Prestador>
    <tipos:Tomador>
      <tipos:IdentificacaoTomador>
        <tipos:CpfCnpj>
          <tipos:Cnpj>{14 dígitos}</tipos:Cnpj>  <!-- ou tipos:Cpf -->
        </tipos:CpfCnpj>
      </tipos:IdentificacaoTomador>
      <tipos:RazaoSocial>{nome}</tipos:RazaoSocial>
      <tipos:Endereco>
        <tipos:Endereco>{logradouro}</tipos:Endereco>
        <tipos:Numero>{numero}</tipos:Numero>
        <tipos:Bairro>{bairro}</tipos:Bairro>
        <tipos:CodigoMunicipio>{IBGE 7 dígitos}</tipos:CodigoMunicipio>
        <tipos:Uf>{UF 2 letras}</tipos:Uf>
        <tipos:Cep>{8 dígitos sem traço}</tipos:Cep>
      </tipos:Endereco>
      <!-- Contato/Email: apenas se fornecido -->
    </tipos:Tomador>
  </tipos:InfRps>
</tipos:Rps>
```

### Regras críticas do RPS
| Campo | Regra |
|-------|-------|
| `InfRps` | `Id="rps{numero}"` — **sem** `versao="3.00"` |
| `ItemListaServico` | Manter ponto decimal: `"1.07"` (não `"0107"`) |
| `ValorServicos` / `BaseCalculo` | Formato `X.XX` (2 casas decimais) |
| `Aliquota` | Formato `X.XXXX` (4 casas decimais) |
| `Cnpj` / `Cpf` | Apenas dígitos, sem máscara |
| `Cep` | 8 dígitos sem traço |
| `CodigoMunicipio` (Guarulhos) | `3518800` |
| `DataEmissao` | `YYYY-MM-DDTHH:mm:ss` |
| `Competencia` / `DataCompetencia` | **NÃO incluir** — inválido no XSD v3 |

---

## 4. Assinatura Digital (XML-DSig)

### Fluxo de assinatura (FINAL FUNCIONAL)
1. **Minificação**: O XML deve ser minificado (remover espaços entre tags e quebras de linha) **ANTES** de assinar. O GINFES é extremamente sensível a espaços em branco no cálculo do Digest.
2. **signXml(xml, 'tipos:InfRps', `rps{numero}`, true)**: Assina cada RPS individualmente.
3. **signXml(xml, 'LoteRps', `lote{id}`, true)**: Assina o lote completo.

### Regras críticas da assinatura
- **Canonicalization**: `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` (Inclusive C14N).
- **Prefixos**: O uso de prefixo `ds:` na Signature é obrigatório. **IMPORTANTE**: Use o suporte nativo da biblioteca de assinatura (ex: `prefix: 'ds'` no xml-crypto). Evite substituições via Regex após a assinatura, pois isso pode corromper o DigestValue.
- **Minificação**: `xml.replace(/>\s+</g, '><').trim()` é essencial antes de processar a assinatura.
- **Certificado**: O `X509Certificate` deve ser incluído na assinatura em linha única (sem quebras).

---

## 5. TLS / Certificado

| Parâmetro | Valor |
|-----------|-------|
| Formato do certificado | PFX/PKCS#12 (A1) |
| `rejectUnauthorized` | `false` (GINFES usa certificado interno) |
| `secureOptions` | `SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION \| SSL_OP_LEGACY_SERVER_CONNECT` |
| Motivo | GINFES Guarulhos usa TLS com renegociação legada, incompatível com OpenSSL 3.x por padrão |

---

## 6. URLs dos Endpoints

| Ambiente | URL |
|----------|-----|
| Produção | `https://producao.ginfes.com.br/ServiceGinfesImpl` |
| Homologação | `https://homologacao.ginfes.com.br/ServiceGinfesImpl` |

### SOAPAction por operação
```
"http://producao.ginfes.com.br/RecepcionarLoteRpsV3"
"http://producao.ginfes.com.br/ConsultarSituacaoLoteRpsV3"
"http://producao.ginfes.com.br/ConsultarLoteRpsV3"
"http://producao.ginfes.com.br/ConsultarNfsePorRpsV3"
"http://producao.ginfes.com.br/CancelarNfseV3"
```

---

## 7. Rota de Teste / Debug

Rota disponível apenas com a chave correta:
```
GET /api/nfse/test-realfibra?secret=antigravity_debug_123
```

Testa a emissão de uma NFS-e de R$ 1,00 para o cliente **Real Fibra Telecom LTDA** usando a configuração fiscal ativa do banco de dados.

---

## 8. Erros Conhecidos e Diagnóstico

| Código | Descrição | Causa mais comum | Solução |
|--------|-----------|------------------|---------|
| **E160** | Arquivo fora do schema XML | Payload no formato errado, campos extras ou ausentes | Seguir estrutura legada do template |
| **E185** | Arquivo de cabeçalho fora do schema | `arg0` com string escapada ou namespace errado | Usar XML real com `ns2:cabecalho` |
| **E302** | Assinatura inválida | Namespace propagado pela canonicalização C14N altera o digest | Verificar contexto de namespace no momento da assinatura |

---

## 9. Checklist de Validação

Antes de testar no servidor do GINFES, verificar:

- [ ] `arg0` contém `<ns2:cabecalho versao="3" xmlns:ns2="...">` como XML real
- [ ] `arg1` contém `EnviarLoteRpsEnvio` com namespaces corretos
- [ ] `LoteRps` **sem** prefixo de namespace no elemento raiz
- [ ] `InfRps` **sem** atributo `versao`
- [ ] `ItemListaServico` com ponto decimal (ex: `1.07`)
- [ ] Campos de valor com 2 casas decimais (`X.XX`)
- [ ] `Aliquota` com 4 casas decimais (`X.XXXX`)
- [ ] Assinatura de cada `tipos:InfRps` antes da assinatura do `LoteRps`
- [ ] CNPJ/CPF/CEP apenas com dígitos
- [ ] `Competencia` **ausente** do XML
- [ ] TLS com `SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION`

---

## 10. Histórico de Commits Relevantes

| Commit | Descrição |
|--------|-----------|
| `4e35ee1` | Estado funcional de referência pré-InfinitePay |
| `858849f` | Introdução da InfinitePay — primeiro ponto de divergência |
| `59674d4` | Restauração da estrutura SOAP legada (este arquivo) |
