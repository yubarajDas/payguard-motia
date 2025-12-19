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
  method: 'PATCH',
  path: '/payguard/bills/:id/pay',
  name: 'PayBill',
  description: 'Marks a bill as paid',
  flows: ['payguard'],
  emits: [],
  bodySchema: z.object({
    paymentAmount: z.number().positive().optional(),
    paymentDate: z.string().optional(),
  }).optional(),
}

export const handler = async (req: any, { logger, state, emit }: any) => {
  const billId = req.params?.id || req.pathParams?.id
  const body = req.body || {}
  const { paymentAmount, paymentDate } = body
  const timestamp = getCurrentTimestamp()

  logger.info('Processing bill payment', { 
    billId,
    paymentAmount,
    paymentDate,
    timestamp
  })

  try {
    // Get the bill from state
    const bill = await state.get(STATE_KEYS.BILLS, billId) as Bill

    if (!bill) {
      logger.warn('Bill not found', { billId })
      return {
        status: 404,
        body: {
          error: 'BILL_NOT_FOUND',
          message: 'Bill not found',
          details: [`Bill ID: ${billId}`],
        },
      }
    }

    if (bill.status === 'paid') {
      logger.warn('Bill already paid', { billId })
      return {
        status: 400,
        body: {
          error: 'BILL_ALREADY_PAID',
          message: 'Bill is already marked as paid',
          details: [`Bill ID: ${billId}`],
        },
      }
    }

    // Update bill status to paid
    const updatedBill: Bill = {
      ...bill,
      status: 'paid',
      updatedAt: timestamp,
    }

    // Store updated bill
    await state.set(STATE_KEYS.BILLS, billId, updatedBill)

    logger.info('Bill marked as paid successfully', {
      billId,
      previousStatus: bill.status,
      newStatus: 'paid',
      timestamp
    })

    // Emit bill.paid event (if we had this event type)
    // await emit({
    //   topic: EVENT_TOPICS.BILL_PAID,
    //   data: {
    //     bill: updatedBill,
    //     paymentAmount: paymentAmount || bill.amount,
    //     paymentDate: paymentDate || timestamp,
    //     timestamp,
    //   },
    // })

    return {
      status: 200,
      body: updatedBill,
    }

  } catch (error) {
    logger.error('Error processing bill payment', { error, billId, timestamp })
    
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to process bill payment',
      },
    }
  }
}