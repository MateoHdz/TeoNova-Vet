/** Gramos equivalentes por 1 unidad */
const GRAMS_PER: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  ml: 1,
  l: 1000,
  unidad: 1,
}

export function toSaleUnit(amount: number, fromUnit: string, saleUnit: string): number {
  const from = GRAMS_PER[fromUnit.toLowerCase()] ?? 1
  const to = GRAMS_PER[saleUnit.toLowerCase()] ?? 1
  return (amount * from) / to
}

export type BulkPackageCalc = {
  packageCost: number
  packageWeight: number
  packageUnit: 'kg' | 'lb' | 'g'
  saleUnit: string
  marginPercent: number
  packageCount: number
}

export type BulkPackageResult = {
  weightInSaleUnit: number
  totalStock: number
  purchasePerUnit: number
  suggestedSalePerUnit: number
  marginPercent: number
  totalPackageCost: number
  minStockSuggested: number
}

export type BulkProfitSummary = {
  totalCost: number
  totalRevenue: number
  totalProfit: number
  marginOnBulkPercent: number
}

export function calcFromPackage(input: BulkPackageCalc): BulkPackageResult | null {
  const {
    packageCost,
    packageWeight,
    packageUnit,
    saleUnit,
    marginPercent,
    packageCount,
  } = input
  if (packageCost <= 0 || packageWeight <= 0 || packageCount <= 0) return null

  const weightInSaleUnit = toSaleUnit(packageWeight, packageUnit, saleUnit)
  if (weightInSaleUnit <= 0) return null

  const purchasePerUnit = packageCost / weightInSaleUnit
  const suggestedSalePerUnit = purchasePerUnit * (1 + marginPercent / 100)
  const totalStock = weightInSaleUnit * packageCount
  const totalPackageCost = packageCost * packageCount

  return {
    weightInSaleUnit,
    totalStock,
    purchasePerUnit,
    suggestedSalePerUnit,
    marginPercent,
    totalPackageCost,
    minStockSuggested: totalStock / 3,
  }
}

/** Ganancia si se vende todo el stock al precio unitario indicado */
export function calcBulkProfitSummary(
  preview: BulkPackageResult,
  salePricePerUnit: number,
): BulkProfitSummary | null {
  if (!preview || salePricePerUnit <= 0) return null
  const totalRevenue = salePricePerUnit * preview.totalStock
  const totalProfit = totalRevenue - preview.totalPackageCost
  const marginOnBulkPercent =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  return {
    totalCost: preview.totalPackageCost,
    totalRevenue,
    totalProfit,
    marginOnBulkPercent,
  }
}

export const BULK_QUICK_QTY: Record<string, { label: string; amount: number }[]> = {
  g: [
    { label: '100 g', amount: 100 },
    { label: '250 g', amount: 250 },
    { label: '500 g', amount: 500 },
    { label: '1 kg', amount: 1000 },
  ],
  kg: [
    { label: '250 g', amount: 0.25 },
    { label: '500 g', amount: 0.5 },
    { label: '1 kg', amount: 1 },
    { label: '2 kg', amount: 2 },
  ],
  lb: [
    { label: '½ lb', amount: 0.5 },
    { label: '1 lb', amount: 1 },
    { label: '2 lb', amount: 2 },
  ],
}
