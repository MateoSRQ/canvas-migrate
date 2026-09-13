import { createServerFn } from '@tanstack/react-start'
import {
  listAllImportCases,
  getImportCaseById,
  executeImportCase,
  getCaseRawTablesList,
  getCaseRawTableData,
  deleteImportCase,
} from '#/server/services/importer'

export const getCasesFn = createServerFn({ method: 'GET' }).handler(async () => {
  return await listAllImportCases()
})

export const getCaseDetailFn = createServerFn({ method: 'GET' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    const caseItem = await getImportCaseById(caseId)
    if (!caseItem) return null
    const tables = await getCaseRawTablesList(caseId)
    return { caseItem, tables }
  })

export const runImportCaseFn = createServerFn({ method: 'POST' })
  .validator((payload?: { name?: string; description?: string }) => payload)
  .handler(async ({ data }) => {
    return await executeImportCase(data)
  })

export const deleteCaseFn = createServerFn({ method: 'POST' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    return await deleteImportCase(caseId)
  })

export const getTableSampleFn = createServerFn({ method: 'GET' })
  .validator((payload: { caseId: string; tableName: string }) => payload)
  .handler(async ({ data }) => {
    const rows = await getCaseRawTableData(data.caseId, data.tableName)
    return rows.slice(0, 50)
  })

export const compareCasesFn = createServerFn({ method: 'POST' })
  .validator((payload: { dbCaseId: string; canvasCaseId: string }) => payload)
  .handler(async ({ data }) => {
    const { compareDbCaseWithCanvasCase } = await import(
      '#/server/services/case-comparison-service'
    )
    return await compareDbCaseWithCanvasCase(data.dbCaseId, data.canvasCaseId)
  })

