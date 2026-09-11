import { createServerFn } from '@tanstack/react-start'
import {
  getCaseHierarchyData,
  getSectionEnrolledStudents,
  clearHierarchyCache,
} from '#/server/services/hierarchy-service'

export const getCaseHierarchyFn = createServerFn({ method: 'GET' })
  .validator((caseId: string) => caseId)
  .handler(async ({ data: caseId }) => {
    return getCaseHierarchyData(caseId)
  })

export const getSectionStudentsFn = createServerFn({ method: 'GET' })
  .validator((payload: { caseId: string; cargaCursoId: number }) => payload)
  .handler(async ({ data }) => {
    return getSectionEnrolledStudents(data.caseId, data.cargaCursoId)
  })

export const clearHierarchyCacheFn = createServerFn({ method: 'POST' })
  .validator((caseId?: string) => caseId)
  .handler(async ({ data: caseId }) => {
    clearHierarchyCache(caseId)
    return { success: true }
  })
