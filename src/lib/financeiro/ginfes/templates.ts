export interface RpsData {
    numero: string;
    serie: string;
    tipo: string;
    dataEmissao: string;    // formato: YYYY-MM-DDTHH:mm:ss
    dataCompetencia: string; // formato: YYYY-MM-DDTHH:mm:ss — primeiro dia do mês de competência
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
    <tipos:Rps>
      <tipos:InfRps Id="rps${rps.numero}">
        <tipos:IdentificacaoRps>
          <tipos:Numero>${rps.numero}</tipos:Numero>
          <tipos:Serie>${rps.serie}</tipos:Serie>
          <tipos:Tipo>${rps.tipo}</tipos:Tipo>
        </tipos:IdentificacaoRps>
        <tipos:DataEmissao>${rps.dataEmissao}</tipos:DataEmissao>
        <tipos:NaturezaOperacao>1</tipos:NaturezaOperacao>
        <tipos:RegimeEspecialTributacao>6</tipos:RegimeEspecialTributacao>
        <tipos:OptanteSimplesNacional>1</tipos:OptanteSimplesNacional>
        <tipos:IncentivadorCultural>2</tipos:IncentivadorCultural>
        <tipos:Status>1</tipos:Status>
        <tipos:Competencia>${rps.dataCompetencia}</tipos:Competencia>
        <tipos:Servico>
          <tipos:Valores>
            <tipos:ValorServicos>${rps.valorServicos.toFixed(2)}</tipos:ValorServicos>
            <tipos:IssRetido>${rps.issRetido}</tipos:IssRetido>
            <tipos:BaseCalculo>${rps.valorServicos.toFixed(2)}</tipos:BaseCalculo>
            <tipos:Aliquota>${rps.aliquota.toFixed(4)}</tipos:Aliquota>
          </tipos:Valores>
          <tipos:ItemListaServico>${rps.itemListaServico}</tipos:ItemListaServico>
          <tipos:Discriminacao>${rps.discriminacao}</tipos:Discriminacao>
          <tipos:CodigoMunicipio>${rps.codigoMunicipio}</tipos:CodigoMunicipio>
        </tipos:Servico>
        <tipos:Prestador>
          <tipos:Cnpj>${rps.prestador.cnpj}</tipos:Cnpj>
          <tipos:InscricaoMunicipal>${rps.prestador.inscricaoMunicipal}</tipos:InscricaoMunicipal>
        </tipos:Prestador>
        <tipos:Tomador>
          <tipos:IdentificacaoTomador>
            <tipos:CpfCnpj>
              <tipos:${rps.tomador.cpfCnpj.length > 11 ? 'Cnpj' : 'Cpf'}>${rps.tomador.cpfCnpj}</tipos:${rps.tomador.cpfCnpj.length > 11 ? 'Cnpj' : 'Cpf'}>
            </tipos:CpfCnpj>
          </tipos:IdentificacaoTomador>
          <tipos:RazaoSocial>${rps.tomador.razaoSocial}</tipos:RazaoSocial>
          <tipos:Endereco>
            <tipos:Endereco>${rps.tomador.endereco}</tipos:Endereco>
            <tipos:Numero>${rps.tomador.numero}</tipos:Numero>
            <tipos:Bairro>${rps.tomador.bairro}</tipos:Bairro>
            <tipos:CodigoMunicipio>${rps.tomador.codigoMunicipio}</tipos:CodigoMunicipio>
            <tipos:Uf>${rps.tomador.uf}</tipos:Uf>
            <tipos:Cep>${rps.tomador.cep}</tipos:Cep>
          </tipos:Endereco>
          ${rps.tomador.email ? `<tipos:Contato><tipos:Email>${rps.tomador.email}</tipos:Email></tipos:Contato>` : ''}
        </tipos:Tomador>
      </tipos:InfRps>
    </tipos:Rps>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/servico_enviar_lote_rps_envio_v03.xsd" xmlns:tipos="http://www.ginfes.com.br/tipos_v03.xsd">
  <LoteRps Id="lote${loteId}">
    <tipos:NumeroLote>${loteId}</tipos:NumeroLote>
    <tipos:Cnpj>${rpsList[0].prestador.cnpj}</tipos:Cnpj>
    <tipos:InscricaoMunicipal>${rpsList[0].prestador.inscricaoMunicipal}</tipos:InscricaoMunicipal>
    <tipos:QuantidadeRps>${rpsList.length}</tipos:QuantidadeRps>
    <tipos:ListaRps>
      ${rpsXmls}
    </tipos:ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}
