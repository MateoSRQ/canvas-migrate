import { createServerFn } from '@tanstack/react-start'
import { getForecastData } from '#/server/services/forecast-service'

export const getForecastDataFn = createServerFn({ method: 'GET' })
  .validator(
    (payload: {
      caseId: string
      periodoId?: number | null
      periodoIds?: number[] | null
      sedeId?: number | null
    }) => payload
  )
  .handler(async ({ data }) => {
    return getForecastData(data.caseId, {
      periodoId: data.periodoId,
      periodoIds: data.periodoIds,
      sedeId: data.sedeId,
    })
  })
