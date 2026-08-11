import { defineConfig } from '@rsbuild/core'
import { resolve } from 'node:path'
import { pluginReact } from '@rsbuild/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild'

export default defineConfig({
  server: {
    port: 3000,
  },
  tools: {
    rspack(config, { environment, isProd }) {
      if (environment.name !== 'ssr') return

      if (isProd) {
        config.externals = ['bun:sqlite']
        config.externalsType = 'module'
        config.resolve ??= {}
        config.resolve.alias = {
          ...(config.resolve.alias ?? {}),
          './driver$': resolve(process.cwd(), 'src/server/db/driver.bun.ts'),
        }
      } else {
        config.externals = { 'better-sqlite3': 'commonjs better-sqlite3' }
      }
    },
  },
  plugins: [pluginReact(), tanstackStart()],
})
