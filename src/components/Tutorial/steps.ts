export interface TutorialStep {
  /** Valor do atributo data-tour do elemento alvo. Null = passo centralizado sem highlight. */
  target: string | null
  titulo: string
  descricao: string
  /** Botão de ação opcional (ex.: "Inserir exemplo"). */
  acao?: {
    label: string
    /** Identificador do handler resolvido pelo Tutorial.tsx. */
    handler: 'inserirExemplo'
  }
}

export const STEPS: TutorialStep[] = [
  {
    target: null,
    titulo: 'Bem-vindo ao Simulador Tributário',
    descricao: 'Esta ferramenta projeta o impacto da Reforma Tributária (LC 214/2025) nas operações da Arval entre 2026 e 2033. Vou mostrar como usar em ~1 minuto.',
  },
  {
    target: 'ano-tabs',
    titulo: 'Selecione o ano',
    descricao: 'Cada ano tem um regime diferente. 2026 ainda usa PIS/COFINS; de 2027 a 2033 a CBS e o IBS sobem progressivamente. Clique num ano para focar nele.',
  },
  {
    target: 'operacoes',
    titulo: 'Insira os valores',
    descricao: 'Aqui você lança o valor de cada operação por ano. Para mostrar o cálculo em ação, posso preencher um exemplo com R$ 1.000.000 em Rec. Locação para 2026.',
    acao: {
      label: 'Inserir exemplo',
      handler: 'inserirExemplo',
    },
  },
  {
    target: 'painel-aliquotas',
    titulo: 'Ajuste de alíquotas em massa',
    descricao: 'Se sua empresa tem alíquota diferente da padrão (regime cumulativo, redução etc.), aplique uma vez aqui e o sistema replica em todas as operações do ano.',
  },
  {
    target: 'resultado-bar',
    titulo: 'Resultado anual',
    descricao: 'Cada card mostra o resultado líquido do ano (débitos − créditos) e a variação vs. o ano anterior. Clique em qualquer ano para alternar.',
  },
  {
    target: 'tributos',
    titulo: 'Detalhamento por tributo',
    descricao: 'Veja base, alíquota e valor de cada tributo (PIS/COFINS em 2026; CBS/IBS daí em diante). As alíquotas são editáveis — clique no número para customizar uma operação específica.',
  },
  {
    target: 'resumo-tabela',
    titulo: 'Comparativo plurianual',
    descricao: 'Tabela com débitos, créditos e total a pagar de cada ano lado a lado. Clique numa linha para expandir o detalhamento.',
  },
  {
    target: 'topbar-acoes',
    titulo: 'Excel: import e export',
    descricao: 'Baixar Template dá uma planilha vazia para preencher offline. Importar XLSX carrega valores em massa. Exportar XLSX gera um relatório formatado com Apuração Geral + detalhe por operação.',
  },
]
