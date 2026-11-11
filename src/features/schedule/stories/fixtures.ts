import type {
  CellConflict,
  Employee,
  ScheduleDate,
  ScheduleRow,
  ShiftTemplate,
  ShiftViewModel,
} from '@schedule/domain/types'

export const employees: Employee[] = [
  { id: 'employee-1', name: 'Анна Смирнова', position: 'Менеджер' },
  { id: 'employee-2', name: 'Дмитрий Волков', position: 'Администратор' },
  { id: 'employee-3', name: 'Мария Александрова', position: 'Оператор' },
  { id: 'employee-4', name: 'Алексей Морозов', position: 'Менеджер' },
  { id: 'employee-5', name: 'Екатерина Соколова', position: 'Оператор' },
  { id: 'employee-6', name: 'Иван Лебедев', position: 'Менеджер' },
  { id: 'employee-7', name: 'Ольга Новикова', position: 'Администратор' },
  { id: 'employee-8', name: 'Никита Павлов', position: 'Оператор' },
]

export const templates: ShiftTemplate[] = [
  {
    id: 'morning',
    label: 'Утро',
    colorKey: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    endDayOffset: 0,
    sourceTemplateId: 'morning',
    durationMinutes: 480,
  },
  {
    id: 'day',
    label: 'День',
    colorKey: 'day',
    startTime: '10:00',
    endTime: '19:00',
    endDayOffset: 0,
    sourceTemplateId: 'day',
    durationMinutes: 540,
  },
  {
    id: 'evening',
    label: 'Вечер',
    colorKey: 'evening',
    startTime: '16:00',
    endTime: '00:00',
    endDayOffset: 1,
    sourceTemplateId: 'evening',
    durationMinutes: 480,
  },
]

export const customShift: ShiftViewModel = {
  label: 'Своя смена',
  colorKey: 'custom',
  startTime: '10:00',
  endTime: '23:00',
  endDayOffset: 0,
  sourceTemplateId: null,
  durationMinutes: 780,
}

export function makeDates(startDate: string, count: number): ScheduleDate[] {
  const start = new Date(`${startDate}T12:00:00Z`)
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(start)
    current.setUTCDate(start.getUTCDate() + index)
    return {
      date: current.toISOString().slice(0, 10),
      weekdayLabel: new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' }).format(
        current,
      ),
      dayLabel: String(current.getUTCDate()),
    }
  })
}

export const weekDates = makeDates('2026-11-09', 7)
export const monthDates = makeDates('2026-11-01', 30)
export const emptyRows: ScheduleRow[] = employees.map((employee) => ({
  employee,
  scheduledMinutes: 0,
  cells: {},
}))
export const weekRows: ScheduleRow[] = employees.map((employee, row) => {
  const cells: ScheduleRow['cells'] = {}
  weekDates.forEach((date, column) => {
    if ((row + column) % 3 !== 0) {
      cells[date.date] = { ...templates[(row + column) % templates.length]! }
    }
  })
  return {
    employee,
    cells,
    scheduledMinutes: Object.values(cells).reduce(
      (sum, shift) => sum + (shift?.durationMinutes || 0),
      0,
    ),
  }
})

export const conflicts: CellConflict[] = [
  {
    cell: { employeeId: employees[0]!.id, workDate: weekDates[0]!.date },
    employeeName: employees[0]!.name,
    local: customShift,
    remote: { ...templates[0]! },
  },
]
