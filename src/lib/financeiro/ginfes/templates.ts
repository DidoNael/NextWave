export interface RpsData {
    numero: string;
    serie: string;
    tipo: string;
    dataEmissao: string;
    valorServicos: number;
    aliquota: number;
    issRetido: string;
    itemListaServico: string;
    codigoMunicipio: string;
    discriminacao: string;
    prestador: {
        cnpj: string;
        inscricaoMunicipal: string;
    };
    tomador: {
        cpfCnpj: string;
        razaoSocial: string;
        endereco: string;
        numero: string;
        bairro: string;
        codigoMunicipio: string;
        uf: string;
        cep: string;
        email?: string;
    };
}

export function generateLoteRpsXml(loteId: string, rpsList: RpsData[]): string {
    const rpsXmls = rpsList.map(rps => `
    <Rps>
      <InfRps Id="rps${rps.numero}">
        <IdentificacaoRps>
          <Numero>${rps.numero}</Numero>
          <Serie>${rps.serie}</Serie>
          <Tipo>${rps.tipo}</Tipo>
        </IdentificacaoRps>
        <DataEmissao>${rps.dataEmissao}</DataEmissao>
        <NaturezaOperacao>1</NaturezaOperacao>
        <OptanteSimplesNacional>1</OptanteSimplesNacional>
        <IncentivadorCultural>2</IncentivadorCultural>
        <Status>1</Status>
        <Servico>
          <Valores>
            <ValorServicos>${rps.valorServicos.toFixed(2)}</ValorServicos>
            <IssRetido>${rps.issRetido}</IssRetido>
            <BaseCalculo>${rps.valorServicos.toFixed(2)}</BaseCalculo>
            <Aliquota>${rps.aliquota.toFixed(4)}</Aliquota>
          </Valores>
          <ItemListaServico>${rps.itemListaServico}</ItemListaServico>
          <CodigoMunicipio>${rps.codigoMunicipio}</CodigoMunicipio>
          <Discriminacao>${rps.discriminacao}</Discriminacao>
        </Servico>
        <Prestador>
          <Cnpj>${rps.prestador.cnpj}</Cnpj>
          <InscricaoMunicipal>${rps.prestador.inscricaoMunicipal}</InscricaoMunicipal>
        </Prestador>
        <Tomador>
          <IdentificacaoTomador>
            <CpfCnpj>
              <${rps.tomador.cpfCnpj.length > 11 ? 'Cnpj' : 'Cpf'}>${rps.tomador.cpfCnpj}</${rps.tomador.cpfCnpj.length > 11 ? 'Cnpj' : 'Cpf'}>
            </CpfCnpj>
          </IdentificacaoTomador>
          <RazaoSocial>${rps.tomador.razaoSocial}</RazaoSocial>
          <Endereco>
            <Endereco>${rps.tomador.endereco}</Endereco>
            <Numero>${rps.tomador.numero}</Numero>
            <Bairro>${rps.tomador.bairro}</Bairro>
            <CodigoMunicipio>${rps.tomador.codigoMunicipio}</CodigoMunicipio>
            <Uf>${rps.tomador.uf}</Uf>
            <Cep>${rps.tomador.cep}</Cep>
          </Endereco>
          ${rps.tomador.email ? `<Contato><Email>${rps.tomador.email}</Email></Contato>` : ''}
        </Tomador>
      </InfRps>
    </Rps>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd">
  <LoteRps Id="lote${loteId}">
    <NumeroLote>${loteId}</NumeroLote>
    <Cnpj>${rpsList[0].prestador.cnpj}</Cnpj>
    <InscricaoMunicipal>${rpsList[0].prestador.inscricaoMunicipal}</InscricaoMunicipal>
    <QuantidadeRps>${rpsList.length}</QuantidadeRps>
    <ListaRps>
      ${rpsXmls}
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}
