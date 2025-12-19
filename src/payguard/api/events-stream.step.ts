import { ApiRouteConfig } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  method: 'GET',
  path: '/payguard/events/stream',
  name: 'EventsStream',
  description: 'Server-Sent Events stream for real-time PayGuard updates',
  flows: ['payguard'],
  emits: [],
  responseSchema: {
    200: z.any(), // SSE response
  },
}

export const handler = async (req: any, { logger }: any) => {
  logger.info('Starting SSE stream for PayGuard events')

  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  }

  // Create a simple event stream
  // In a real implementation, this would connect to the event system
  const eventData = {
    type: 'connection',
    timestamp: new Date().toISOString(),
    message: 'Connected to PayGuard event stream',
  }

  const sseData = `data: ${JSON.stringify(eventData)}\n\n`

  return {
    status: 200,
    headers,
    body: sseData,
  }
}