import { createServerFn } from '@tanstack/react-start'
import {
  listAllCanvasCases,
  getCanvasCaseById,
  getCanvasCaseAccountsTree,
  executeCanvasImportCase,
  deleteCanvasCase,
  getCanvasRawEntitySample,
  testCanvasApiConnection,
  getCanvasCourseEnrollments,
  type CanvasImportCaseOptions,
} from '#/server/services/canvas-importer'

export const getCanvasCasesFn = createServerFn({ method: 'GET' }).handler(async () => {
  return await listAllCanvasCases()
})

export const getCanvasCaseDetailFn = createServerFn({ method: 'GET' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    return await getCanvasCaseById(caseId)
  })

export const getCanvasCaseAccountsTreeFn = createServerFn({ method: 'GET' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    return await getCanvasCaseAccountsTree(caseId)
  })

export const runCanvasImportCaseFn = createServerFn({ method: 'POST' })
  .validator((payload?: CanvasImportCaseOptions) => payload)
  .handler(async ({ data }) => {
    return await executeCanvasImportCase(data)
  })

export const deleteCanvasCaseFn = createServerFn({ method: 'POST' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    return await deleteCanvasCase(caseId)
  })

export const getCanvasEntitySampleFn = createServerFn({ method: 'GET' })
  .validator((payload: { caseId: string; entityType: string }) => payload)
  .handler(async ({ data }) => {
    return await getCanvasRawEntitySample(data.caseId, data.entityType)
  })

export const testCanvasConnectionFn = createServerFn({ method: 'POST' })
  .validator((payload?: { endpoint?: string; apiKey?: string }) => payload)
  .handler(async ({ data }) => {
    return await testCanvasApiConnection(data?.endpoint, data?.apiKey)
  })

export const getCanvasCourseEnrollmentsFn = createServerFn({ method: 'GET' })
  .validator((payload: { caseId: string; courseId: number }) => payload)
  .handler(async ({ data }) => {
    return await getCanvasCourseEnrollments(data.caseId, data.courseId)
  })

export const auditCanvasExportFn = createServerFn({ method: 'POST' })
  .validator(
    (payload: {
      caseId: string
      selectedSectionIds: number[]
      rootAccountId?: string
      endpoint?: string
      apiKey?: string
    }) => payload
  )
  .handler(async ({ data }) => {
    const { auditExportAgainstCanvasApi } = await import('#/server/services/canvas-audit-service')
    return await auditExportAgainstCanvasApi(data)
  })


