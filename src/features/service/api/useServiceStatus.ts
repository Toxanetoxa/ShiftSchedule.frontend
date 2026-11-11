import { useQuery } from '@tanstack/vue-query'
import { apiBaseUrl, getJson } from '@/shared/api/client'

export interface ServiceStatus {
  service: string
  status: 'ok'
}

async function getServiceStatus(signal: AbortSignal): Promise<ServiceStatus> {
  const data = await getJson('v1', signal)

  if (
    typeof data !== 'object' ||
    data === null ||
    !('service' in data) ||
    typeof data.service !== 'string' ||
    !('status' in data) ||
    data.status !== 'ok'
  ) {
    throw new Error('Ответ API не соответствует ожидаемому формату сервиса.')
  }

  return { service: data.service, status: data.status }
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['service-status', apiBaseUrl],
    queryFn: ({ signal }) => getServiceStatus(signal),
  })
}
