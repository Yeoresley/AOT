export type Currency = 'USD' | 'CUP';

export interface WorkOrderCostSummary {
  totalCostUsd: number;
  totalCostCup: number;
  marginUsd: number;
  marginCup: number;
  invoiceTotalUsd: number;
  invoiceTotalCup: number;
}
