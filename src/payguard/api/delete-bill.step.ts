import { ApiRouteConfig } from 'motia'
import { z } from 'zod'
import { 
  Bill,
  STATE_KEYS,
  EVENT_TOPICS,
  getCurrentTimestamp
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  method: 'DELETE',
  path: '/payguard/bills/:id',
  name: 'DeleteBill',
  description: 'Deletes a bill from the system',
  flows: ['payguard'],
  emits: [],
  responseSchema: {
    200: z.object({
      message: z.string(),
      deletedBill: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }),
    404: z.object({
      error: z.string(),
      message: z.string(),
      details: z.array(z.string()).optional(),
    }),
  },
}

export const handler = async (req: any, { logger, state }: any) => {
  const billId = req.params?.id || req.pathParams?.id
  const timestamp = getCurrentTimestamp()

  logger.info('Processing bill deletion', { 
    billId,
    timestamp
  })

  try {
    // Get the bill from state to verify it exists
    const bill = await state.get(STATE_KEYS.BILLS, billId) as Bill

    if (!bill) {
      logger.warn('Bill not found for deletion', { billId })
      return {
        status: 404,
        body: {
          error: 'BILL_NOT_FOUND',
          message: 'Bill not found',
          details: [`Bill ID: ${billId}`],
        },
      }
    }

    // Delete the bill from state
    await state.delete(STATE_KEYS.BILLS, billId)

    logger.info('Bill deleted successfully', {
      billId,
      billName: bill.name,
      timestamp
    })

    return {
      status: 200,
      body: {
        message: 'Bill deleted successfully',
        deletedBill: {
          id: bill.id,
          name: bill.name,
        },
      },
    }

  } catch (error) {
    logger.error('Error deleting bill', { error, billId, timestamp })
    
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete bill',
      },
    }
  }
}