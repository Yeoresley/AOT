import { Injectable } from '@nestjs/common';

export interface CostTotals {
  salaryUsd: number;
  salaryCup: number;
  salaryOverheadUsd: number;
  salaryOverheadCup: number;
  depreciationUsd: number;
  depreciationCup: number;
  outsourcedUsd: number;
  outsourcedCup: number;
  consumablesUsd: number;
  consumablesCup: number;
  ppaUsd: number;
  ppaCup: number;
  totalCostUsd: number;
  totalCostCup: number;
  marginUsd: number;
  marginCup: number;
  invoiceTotalUsd: number;
  invoiceTotalCup: number;
}

@Injectable()
export class WorkOrderCostingService {
  calculate(input: {
    salaryUsdBase: number;
    salaryCupBase: number;
    depreciationUsd: number;
    depreciationCup: number;
    outsourcedUsd: number;
    outsourcedCup: number;
    consumablesUsd: number;
    consumablesCup: number;
    ppaUsd: number;
    ppaCup: number;
    marginUsdPct: number;
    marginCupPct: number;
  }): CostTotals {
    const salaryUsd = input.salaryUsdBase * 1.0909;
    const salaryCup = input.salaryCupBase * 1.0909;
    const salaryOverheadUsd = 0;
    const salaryOverheadCup = salaryCup * 1.19;

    const totalCostUsd =
      salaryUsd +
      salaryOverheadUsd +
      input.depreciationUsd +
      input.outsourcedUsd +
      input.consumablesUsd +
      input.ppaUsd;

    const totalCostCup =
      salaryCup +
      salaryOverheadCup +
      input.depreciationCup +
      input.outsourcedCup +
      input.consumablesCup +
      input.ppaCup;

    const marginUsd = totalCostUsd * (input.marginUsdPct / 100);
    const marginCup = totalCostCup * (input.marginCupPct / 100);

    return {
      salaryUsd,
      salaryCup,
      salaryOverheadUsd,
      salaryOverheadCup,
      depreciationUsd: input.depreciationUsd,
      depreciationCup: input.depreciationCup,
      outsourcedUsd: input.outsourcedUsd,
      outsourcedCup: input.outsourcedCup,
      consumablesUsd: input.consumablesUsd,
      consumablesCup: input.consumablesCup,
      ppaUsd: input.ppaUsd,
      ppaCup: input.ppaCup,
      totalCostUsd,
      totalCostCup,
      marginUsd,
      marginCup,
      invoiceTotalUsd: totalCostUsd + marginUsd,
      invoiceTotalCup: totalCostCup + marginCup,
    };
  }
}
