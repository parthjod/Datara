import { NextRequest } from 'next/server'
import { permissionsEmitter } from '@/lib/emitter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let isClosed = false

  const stream = new ReadableStream({
    start(controller) {
      const onUpdate = (data: unknown) => {
        if (isClosed) return
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      permissionsEmitter.on('update', onUpdate)

      // Send initial connection comment
      controller.enqueue(new TextEncoder().encode(`: connected\n\n`))

      req.signal.addEventListener('abort', () => {
        isClosed = true
        permissionsEmitter.off('update', onUpdate)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
