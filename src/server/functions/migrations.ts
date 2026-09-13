import { createServerFn } from '@tanstack/react-start'
import {
  listMigrationPackages,
  getMigrationTree,
} from '#/server/services/migration-service'

export const listMigrationsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await listMigrationPackages()
  }
)

export const getMigrationTreeFn = createServerFn({ method: 'GET' })
  .validator((folderName: string) => folderName)
  .handler(async ({ data: folderName }) => {
    return await getMigrationTree(folderName)
  })
