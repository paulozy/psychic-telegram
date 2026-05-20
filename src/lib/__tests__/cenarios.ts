/**
 * Cenários canônicos para validação ponta-a-ponta.
 *
 * 5 perfis de locadora × 2-4 anos cada = ~14 entries.
 * Compartilhado entre testes unitários (`cenarios.test.ts`) e Playwright specs.
 *
 * Faixas esperadas de cargaConsolidada são bands de sanidade — falhas indicam
 * ou bug no modelo ou faixa imprecisa (ajustar com tributarista).
 */

import {
  atualizarReducaoBase,
  atualizarValor,
  estadoInicial,
} from '../simulador.ts'
import type { Estado } from '../../types/simulador.ts'

export interface Cenario {
  nome: string
  descricao: string
  ano: number
  /** Recebe Estado base, retorna Estado populado com os valores do cenário. */
  setup: (estado: Estado) => Estado
  esperado: {
    receitaTotal: number
    cargaConsolidadaMin: number
    cargaConsolidadaMax: number
  }
}

// ─── Setups ──────────────────────────────────────────────────────────────────

function setupSmall(estado: Estado, ano: number): Estado {
  // Receita R$ 8M: 92% loc / 3% fin / 5% venda. Frota ~200 carros (~R$ 16M ativos).
  estado = atualizarValor(estado, ano, 'rec_locacao', 7_360_000)
  estado = atualizarValor(estado, ano, 'receita_financeira', 240_000)
  estado = atualizarValor(estado, ano, 'venda_ativo', 400_000)
  estado = atualizarValor(estado, ano, 'compra_ativo', 4_000_000)
  estado = atualizarValor(estado, ano, 'cred_serv', 600_000)
  estado = atualizarValor(estado, ano, 'cred_deprec', 1_200_000)
  estado = atualizarValor(estado, ano, 'cred_juros', 400_000)
  return estado
}

function setupMidBaseline(estado: Estado, ano: number): Estado {
  // Baseline Arval: R$ 40M / 1000 carros (~R$ 90M ativos). Renovação ~25%/yr.
  estado = atualizarValor(estado, ano, 'rec_locacao', 35_200_000)
  estado = atualizarValor(estado, ano, 'receita_financeira', 1_600_000)
  estado = atualizarValor(estado, ano, 'venda_ativo', 3_200_000)
  estado = atualizarValor(estado, ano, 'compra_ativo', 22_000_000)
  estado = atualizarValor(estado, ano, 'cred_serv', 3_000_000)
  estado = atualizarValor(estado, ano, 'cred_deprec', 6_500_000)
  estado = atualizarValor(estado, ano, 'cred_juros', 2_500_000)
  return estado
}

function setupLarge(estado: Estado, ano: number): Estado {
  // Multi-estadual: R$ 220M / 5000 carros (~R$ 450M ativos).
  estado = atualizarValor(estado, ano, 'rec_locacao', 187_000_000)
  estado = atualizarValor(estado, ano, 'receita_financeira', 11_000_000)
  estado = atualizarValor(estado, ano, 'venda_ativo', 22_000_000)
  estado = atualizarValor(estado, ano, 'compra_ativo', 110_000_000)
  estado = atualizarValor(estado, ano, 'cred_serv', 16_000_000)
  estado = atualizarValor(estado, ano, 'cred_deprec', 32_000_000)
  estado = atualizarValor(estado, ano, 'cred_juros', 14_000_000)
  return estado
}

function setupHeavyDisposal(estado: Estado, ano: number): Estado {
  // Frota em renovação intensa: venda_ativo 27% da receita.
  // Stress-test do art. 406: bucket default '2024-2026' + custo > venda = ganho zero = tributo zero.
  estado = atualizarValor(estado, ano, 'rec_locacao', 26_600_000)
  estado = atualizarValor(estado, ano, 'receita_financeira', 1_140_000)
  estado = atualizarValor(estado, ano, 'venda_ativo', 10_260_000)
  // Custo de aquisição típico > venda (desmobilização com depreciação) → isenção efetiva.
  estado = atualizarReducaoBase(estado, ano, 'venda_ativo', 13_000_000)
  estado = atualizarValor(estado, ano, 'compra_ativo', 30_000_000)
  estado = atualizarValor(estado, ano, 'cred_serv', 2_800_000)
  estado = atualizarValor(estado, ano, 'cred_deprec', 6_500_000)
  estado = atualizarValor(estado, ano, 'cred_juros', 2_200_000)
  return estado
}

function setupEdgeZeroCredits(estado: Estado, ano: number): Estado {
  // Upper bound: sem créditos para mostrar carga próxima do nominal.
  estado = atualizarValor(estado, ano, 'rec_locacao', 38_000_000)
  estado = atualizarValor(estado, ano, 'receita_financeira', 2_000_000)
  // venda_ativo, créditos = 0 (não chamamos atualizarValor → permanecem 0)
  return estado
}

// ─── Cenários ────────────────────────────────────────────────────────────────

export const CENARIOS: Cenario[] = [
  // 1. SMALL — Receita total R$ 8M
  {
    nome: '1-small-2026', ano: 2026,
    descricao: 'Locadora regional, 200 carros, R$ 8M receita — regime PIS/COFINS',
    setup: e => setupSmall(e, 2026),
    esperado: { receitaTotal: 8_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '1-small-2028', ano: 2028,
    descricao: 'Locadora regional — CBS pleno + IBS teste',
    setup: e => setupSmall(e, 2028),
    esperado: { receitaTotal: 8_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '1-small-2033', ano: 2033,
    descricao: 'Locadora regional — regime pleno CBS/IBS',
    setup: e => setupSmall(e, 2033),
    esperado: { receitaTotal: 8_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 30 },
  },

  // 2. MID BASELINE ARVAL — Receita total R$ 40M
  {
    nome: '2-mid-2026', ano: 2026,
    descricao: 'Baseline Arval, 1000 carros, R$ 40M receita — regime PIS/COFINS',
    setup: e => setupMidBaseline(e, 2026),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '2-mid-2028', ano: 2028,
    descricao: 'Baseline Arval — CBS pleno + IBS teste',
    setup: e => setupMidBaseline(e, 2028),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '2-mid-2030', ano: 2030,
    descricao: 'Baseline Arval — transição IBS 20%',
    setup: e => setupMidBaseline(e, 2030),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 18 },
  },
  {
    nome: '2-mid-2033', ano: 2033,
    descricao: 'Baseline Arval — regime pleno',
    setup: e => setupMidBaseline(e, 2033),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 30 },
  },

  // 3. LARGE — Receita total R$ 220M
  {
    nome: '3-large-2026', ano: 2026,
    descricao: 'Multi-estadual, 5000 carros, R$ 220M — regime PIS/COFINS',
    setup: e => setupLarge(e, 2026),
    esperado: { receitaTotal: 220_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '3-large-2030', ano: 2030,
    descricao: 'Multi-estadual — transição IBS 20%',
    setup: e => setupLarge(e, 2030),
    esperado: { receitaTotal: 220_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 18 },
  },
  {
    nome: '3-large-2033', ano: 2033,
    descricao: 'Multi-estadual — regime pleno',
    setup: e => setupLarge(e, 2033),
    esperado: { receitaTotal: 220_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 30 },
  },

  // 4. HEAVY DISPOSAL — Stress-test isenção venda_ativo
  {
    nome: '4-heavy-2027', ano: 2027,
    descricao: 'Frota em renovação intensa — valida isenção venda_ativo 2027',
    setup: e => setupHeavyDisposal(e, 2027),
    esperado: { receitaTotal: 38_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },
  {
    nome: '4-heavy-2029', ano: 2029,
    descricao: 'Frota em renovação intensa — valida isenção venda_ativo 2029',
    setup: e => setupHeavyDisposal(e, 2029),
    esperado: { receitaTotal: 38_000_000, cargaConsolidadaMin: 0, cargaConsolidadaMax: 12 },
  },

  // 5. EDGE — Sem créditos, upper bound de carga
  {
    nome: '5-edge-2026', ano: 2026,
    descricao: 'Edge case: zero créditos — upper bound PIS/COFINS',
    setup: e => setupEdgeZeroCredits(e, 2026),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 7, cargaConsolidadaMax: 12 },
  },
  {
    nome: '5-edge-2033', ano: 2033,
    descricao: 'Edge case: zero créditos — upper bound regime pleno (~27%)',
    setup: e => setupEdgeZeroCredits(e, 2033),
    esperado: { receitaTotal: 40_000_000, cargaConsolidadaMin: 24, cargaConsolidadaMax: 30 },
  },
]
