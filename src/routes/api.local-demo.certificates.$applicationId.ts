import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getDataDirectory, getDatabase } from '../server/db'
import * as schema from '../server/db/schema'

export const Route = createFileRoute('/api/local-demo/certificates/$applicationId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!params.applicationId.startsWith('application-')) {
          return new Response('Invalid certificate request.', { status: 400 })
        }

        
        const application = getDatabase()
          .select({
            storedName: schema.vendorApplications.certificateStoredName,
            fileName: schema.vendorApplications.certificateFileName,
            mime: schema.vendorApplications.certificateMime,
          })
          .from(schema.vendorApplications)
          .where(eq(schema.vendorApplications.id, params.applicationId))
          .get()

        if (!application) return new Response('Certificate not found.', { status: 404 })

        const certificate = await readFile(
          resolve(getDataDirectory(), 'certificates', application.storedName),
        ).catch(() => null)
        if (!certificate) return new Response('Certificate file is missing.', { status: 404 })

        const safeName = application.fileName.replace(/["\r\n]/g, '_')
        return new Response(certificate, {
          headers: {
            'Content-Type': application.mime,
            'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  },
})
