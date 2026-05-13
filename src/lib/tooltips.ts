/**
 * Tooltips explicativos centralizados.
 *
 * Cada chave casa com uma entidade do domínio: keys de OPERACOES,
 * abreviações de tributo, campos de ApuracaoAno, conceitos auxiliares.
 *
 * Conteúdo validado contra dev-docs/aliquotas-fontes.md e LC 214/2025.
 * Limite ≤150 caracteres por tooltip — estrutura "Definição. Regra/contexto."
 */

/** Tooltips das 7 operações em OPERACOES (src/lib/simulador.ts:3-11). */
export const TOOLTIPS_OPERACAO: Record<string, string> = {
  rec_locacao:
    'Receita de locação de frota — atividade-fim. Regime padrão CBS/IBS após 2026; sem regime específico na LC 214/2025.',
  receita_financeira:
    'Juros, dividendos e ganhos de aplicações. Fora da base de CBS/IBS para empresa não-financeira (LC 214/2025 art. 181+).',
  venda_ativo_pre2026:
    'Venda de imobilizado adquirido até 2026. SEMPRE isenta de CBS/IBS, independente do ano da venda (regra de transição LC 214/2025).',
  venda_ativo_pos2026:
    'Venda de imobilizado adquirido a partir de 2027. 2030-2031: CBS sobre o ganho (valor − custo). 2032+: CBS + IBS sobre o ganho. Informe o custo de aquisição.',
  cred_serv:
    'Serviços de terceiros que geram crédito integral de CBS/IBS pela não-cumulatividade plena (LC 214/2025 art. 47).',
  compra_ativo:
    'Aquisição de bem de capital. Crédito integral e imediato de CBS/IBS no momento da compra (arts. 108/109).',
  cred_deprec:
    'Depreciação fiscal. Editável em 2026 (regime PIS/COFINS). A partir de 2027 não gera crédito — o crédito de bem de capital é tomado integralmente em Compra Ativo (arts. 108/109 LC 214/2025).',
  cred_juros:
    'Juros pagos a instituição financeira. Alíquotas dependem do que o banco informar — campos editáveis no painel do tributo. Defaults baseados em projeções; sobrescreva conforme nota fiscal.',
}

/** Tooltips dos tributos (usados em PainelAliquotas, TributoCard). */
export const TOOLTIPS_TRIBUTO = {
  pis:    'Contribuição para o PIS. Regime atual não-cumulativo (1,65%). Extinta em 2027, substituída pela CBS.',
  cofins: 'Contribuição para o Financiamento da Seguridade Social. 7,60% não-cumulativo. Extinta em 2027, substituída pela CBS.',
  cbs:    'Contribuição sobre Bens e Serviços. Federal. Substitui PIS/COFINS a partir de 2027 (LC 214/2025).',
  ibs:    'Imposto sobre Bens e Serviços. Substitui ICMS e ISS. Transição 2029–2033; apuração unificada no contribuinte.',
  ibsE:   'Parcela estadual do IBS. Apurada junto com a municipal; CG-IBS faz a partilha ex post (LC 214/2025 arts. 39 e 40).',
  ibsM:   'Parcela municipal do IBS. Apurada junto com a estadual; saldos credores compensam débitos de IBS-E no contribuinte.',
}

/** Tooltips das métricas em ApuracaoAno (renderizadas em ResumoTabela). */
export const TOOLTIPS_METRICA = {
  receitaBruta:         'Soma de todas as receitas tipo débito no ano, incluindo as fora da base de CBS/IBS.',
  tributosDebitos:      'Soma bruta dos débitos de todos os tributos (antes de compensação com créditos).',
  creditosCompensaveis: 'Soma dos créditos de PIS/COFINS/CBS/IBS — abatem dos débitos para apurar o resultado líquido.',
  resultadoLiquido:     'Créditos − débitos. Positivo = saldo credor a aproveitar; negativo = a recolher no período.',
  cargaEfetiva:         'Total a recolher ÷ receita tributável. Indicador principal de pressão tributária líquida.',
  cargaBruta:           'Soma dos débitos ÷ receita tributável. Não considera créditos — pressão antes da apuração.',
  cargaPadrao:          'Total a recolher ÷ receita da atividade-fim (locação). Mede a tributação sobre o core business.',
  cargaConsolidada:     'Total a recolher ÷ receita tributável (exclui receitas fora da base, como receita financeira).',
  cargaSobreTotal:      'Total a recolher ÷ receita bruta total. Comparável a benchmarks macro (IBPT, FGV).',
  deltaCarga:           'Variação da carga consolidada vs o ano imediatamente anterior, em pontos percentuais.',
  deltaTributos:        'Variação percentual do total a recolher vs o ano anterior.',
}

/** Tooltips de conceitos auxiliares e elementos de UI. */
export const TOOLTIPS_CONCEITO = {
  vla:             'Alias deprecated — use custoAquisicao para venda_ativo.',
  custoAquisicao:  'Custo de aquisição do bem. A partir de 2030, a venda tributa apenas o ganho (valor − custo) em CBS; 2032+ inclui IBS. Isento até 2029.',
  reducaoBase:     'Parcela do valor da operação que não compõe a base de CBS/IBS.',
  baseEfetiva:     'Valor sobre o qual incide a alíquota: valor da operação menos redução/VLA, limitado a zero.',
  saldoCredor:     'Crédito acumulado quando os créditos do período superam os débitos. Aproveitado nos meses seguintes.',
  badgeDebito:     'Operação tipo débito — receita que gera tributo a pagar.',
  badgeCredito:    'Operação tipo crédito — entrada que gera crédito a compensar débitos.',
  totalDebitos:    'Soma dos valores das operações de débito (Rec. Locação + Receita Financeira + Venda Ativo) no ano.',
  totalCreditos:   'Soma dos valores das operações de crédito (Serv. Tomados + Compra Ativo + Deprec. Fiscal + Juros) no ano.',
  aliqEditavel:    'Pré-preenchido conforme LC 214/2025 · editável',
  aplicarAliqs:    'Aplica os valores informados acima a todas as operações deste ano, sobrescrevendo os defaults.',
  configurarAliqs: 'Expande painel para sobrescrever alíquotas defaults aplicadas a todas as operações.',
  colunaOperacao:  'Nome da operação (receita ou crédito).',
  colunaValor:     'Valor monetário da operação informado pelo usuário.',
  colunaBase:      'Base de cálculo do tributo (valor da operação ou base reduzida).',
  colunaAliq:      'Alíquota aplicada — pode ser sobrescrita manualmente.',
  colunaTributo:   'Tributo apurado (PIS, COFINS, CBS, IBS Estadual ou Municipal).',
  colunaDebito:    'Valor de débito do tributo no período (receitas tributadas).',
  colunaCredito:   'Valor de crédito do tributo (entradas com direito a creditamento).',
  colunaSaldo:     'Saldo = débito − crédito. Positivo gera obrigação; negativo vira saldo credor.',
}
