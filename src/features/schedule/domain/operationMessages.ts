const messages: Record<string, string> = {
  'employee-inactive': 'Нельзя назначить смену неактивному сотруднику.',
  'cell-unavailable': 'Ячейка недоступна в текущем диапазоне.',
  'template-unavailable': 'Шаблон смены больше недоступен.',
  'source-empty': 'В исходной ячейке больше нет смены.',
  'invalid-time': 'Некорректное время смены.',
  overlap: 'Смена пересекается с другим назначением сотрудника, в том числе на соседней дате.',
}

export function operationErrorMessage(reason: string): string {
  return messages[reason] || 'Невозможно применить изменение графика.'
}
