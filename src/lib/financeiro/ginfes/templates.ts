export interface RpsData {
    numero: string;
    serie: string;
    tipo: string;
    dataEmissao: string;              // YYYY-MM-DDTHH:mm:ss
    dataCompetencia: string;          // YYYY-MM-DDTHH:mm:ss — 1º dia do mês de competência
    valorServicos: number;
    aliquota: number;
    issRetido: string;                // 1=Retido 2=Não Retido
    itemListaServico: string;
    codigoMunicipio: string;
    discriminacao: string;
    naturezaOperacao: string;         // 1=Tributação no Município ... 6=Importação de Serviço
    optanteSimplesNacional: string;   // 1=Sim 2=Não
    regimeEspecialTributacao: string; // 1=Estimativa 2=Soc.Profis. 3=Cooperativa 4=MEI 5=ME-EPP 6=Microempresário
    incentivadorCultural: string;     // 1=Sim 2=Não
    exigibilidadeIss: string;         // 1=Exigível 2=NãoIncid. 3=Isenção 4=Exportação 5=Imunidade 6=SuspJud 7=SuspAdm
    codigoTributacaoMunicipio?: string; // opcional — exigido por alguns municípios
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
        <tipos:DataCompetencia>${rps.dataCompetencia}</tipos:DataCompetencia>
        <tipos:NaturezaOperacao>${rps.naturezaOperacao}</tipos:NaturezaOperacao>
        ${rps.regimeEspecialTributacao ? `<tipos:RegimeEspecialTributacao>${rps.regimeEspecialTributacao}</tipos:RegimeEspecialTributacao>` : ''}
        <tipos:OptanteSimplesNacional>${rps.optanteSimplesNacional}</tipos:OptanteSimplesNacional>
        <tipos:IncentivadorCultural>${rps.incentivadorCultural}</tipos:IncentivadorCultural>
        <tipos:Status>1</tipos:Status>
        <tipos:Servico>
          <tipos:Valores>
            <tipos:ValorServicos>${rps.valorServicos.toFixed(2)}</tipos:ValorServicos>
            <tipos:IssRetido>${rps.issRetido}</tipos:IssRetido>
            <tipos:BaseCalculo>${rps.valorServicos.toFixed(2)}</tipos:BaseCalculo>
            <tipos:Aliquota>${rps.aliquota.toFixed(4)}</tipos:Aliquota>
          </tipos:Valores>
          <tipos:ItemListaServico>${rps.itemListaServico}</tipos:ItemListaServico>
          ${rps.codigoTributacaoMunicipio ? `<tipos:CodigoTributacaoMunicipio>${rps.codigoTributacaoMunicipio}</tipos:CodigoTributacaoMunicipio>` : ''}
          <tipos:Discriminacao>${rps.discriminacao}</tipos:Discriminacao>
          <tipos:CodigoMunicipio>${rps.codigoMunicipio}</tipos:CodigoMunicipio>
          <tipos:ExigibilidadeIss>${rps.exigibilidadeIss}</tipos:ExigibilidadeIss>
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
