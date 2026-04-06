# Simulador Tributário — Arval Brasil

Ferramenta web para simulação do impacto da **Reforma Tributária (LC 214/2025)** nas operações da Arval Brasil, cobrindo a transição do regime PIS/COFINS para o novo regime CBS/IBS ao longo de 2026–2033.

## Funcionalidades

- **Entrada de valores por operação e por ano** — painel lateral com cards editáveis para cada tipo de operação (2026–2033)
- **Alíquotas pré-preenchidas automaticamente** conforme a tabela oficial LC 214/2025, editáveis pelo usuário
- **Cálculo em tempo real** de PIS, COFINS, CBS e IBS (Estadual + Municipal) por operação
- **Regras especiais implementadas:**
  - 2026: base CBS/IBS deduzida de PIS e COFINS (ano de teste)
  - Venda Ativo: sem CBS em 2026–2029; redução progressiva de base IBS (*pRedIbs*) de 2029 a 2032
  - Juros s/ Empréstimo: CBS diferenciada e sem PIS/COFINS
  - IBS Municipal: inexistente em 2026, progressivo a partir de 2027
- **Barra de resultado anual** com comparativo percentual entre anos
- **Painel de carga tributária** com barras visuais e variação YoY, expansível para breakdown por tributo
- **Tabela de resumo multi-ano** com receita bruta, total tributos, margem tributária e deltas
- **Exportação XLSX** *(em desenvolvimento)*

## Operações modeladas

| Operação | Tipo |
|---|---|
| Rec. Locação | Débito |
| Venda Ativo | Débito |
| Serv. Tomados | Crédito |
| Compra Ativo | Crédito |
| Deprec. Fiscal | Crédito |
| Juros s/ Empréstimo | Crédito |

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5**
- CSS puro — sem bibliotecas de UI ou gráficos
- Sem banco de dados — estado em memória via `useState`

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Estrutura

```
src/
  app/
    page.tsx              # Entry point
    layout.tsx            # Layout raiz
    globals.css           # Todos os estilos
  components/
    Simulador.tsx          # Componente raiz — estado global e orquestração
    Topbar.tsx             # Header com logo e ações
    PainelEsquerdo.tsx     # Entrada de valores por operação/ano
    ResultadoBar.tsx       # Resultado líquido por ano com variação %
    CargaTributariaPanel.tsx  # Painel de carga tributária efetiva
    TributoCard.tsx        # Detalhamento por tributo (PIS/COFINS/CBS/IBS)
    ResumoTabela.tsx       # Tabela multi-ano com receita, tributos e margem
  lib/
    simulador.ts           # Toda a lógica de negócio, cálculos e tabela de alíquotas
  types/
    simulador.ts           # Tipos TypeScript
```

## Referência

- Alíquotas e regras: [`aliquotas.md`](aliquotas.md)
- Lei Complementar 214/2025 — Reforma Tributária brasileira (CBS/IBS)
