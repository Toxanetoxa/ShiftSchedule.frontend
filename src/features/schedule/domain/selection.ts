import type { CellKey, CellRef, IsoDate } from './types'
import { cellKey } from './types'

export function rectangleSelection(
  employeeIds: readonly string[],
  dates: readonly IsoDate[],
  anchor: CellRef,
  target: CellRef,
): CellKey[] {
  const rows = [employeeIds.indexOf(anchor.employeeId), employeeIds.indexOf(target.employeeId)]
  const columns = [dates.indexOf(anchor.workDate), dates.indexOf(target.workDate)]

  if (rows.includes(-1) || columns.includes(-1)) {
    return []
  }

  const keys: CellKey[] = []
  for (let row = Math.min(...rows); row <= Math.max(...rows); row++) {
    for (let column = Math.min(...columns); column <= Math.max(...columns); column++) {
      keys.push(cellKey({ employeeId: employeeIds[row]!, workDate: dates[column]! }))
    }
  }
  return keys
}
