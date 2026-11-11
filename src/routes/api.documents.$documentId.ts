import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getDataDirectory, getDatabase } from '../server/db'
import * as schema from '../server/db/schema'
import { sessionSubject } from '../server/market/auth'

// Vendor documents open only for a signed-in market admin.
export const Route = createFileRoute('/api/documents/$documentId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!sessionSubject('admin')) return new Response('Sign in as a market admin to open documents.', { status: 401 })
        const doc = getDatabase().select().from(schema.marketDocuments).where(eq(schema.marketDocuments.id, params.documentId)).get()
        if (!doc) return new Response('Document not found.', { status: 404 })
        const file = await readFile(resolve(getDataDirectory(), 'market-documents', doc.vendorId, doc.storedName)).catch(() => null)
        if (!file) return new Response('The file for this document is missing.', { status: 404 })
        const name = doc.fileName.replace(/["\r\n]/g, '_')
        return new Response(file, {
          headers: {
            'Content-Type': doc.mime,
            'Content-Disposition': `inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
            'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; plugin-types application/pdf",
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, no-store',
          },
        })
      },
    },
  },
})
