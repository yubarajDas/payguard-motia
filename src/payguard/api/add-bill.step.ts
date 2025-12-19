import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { 
  createBillRequestSchema, 
  billSchema, 
  Bill,
  EVENT_TOPICS,
  STATE_KEYS,
  generateBillId,
  getCurrentTimestamp,
  isDateInFuture
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AddBill',
  description: 'API endpoint to register new bills in the PayGuard system',
  flows: ['payguard'],
  method: 'POST',
  path: '/payguard/bills',
  bodySchema: createBillRequestSchema,
  responseSchema: {
    200: billSchema,
    400: z.object({
      error: z.string(),
      message: z.string(),
      details: z.array(z.string()).optional(),
    }),
  },
  emits: [EVENT_TOPICS.BILL_CREATED],
}

export const handler: Handlers['AddBill'] = async (req, { logger, traceId, emit, state }) => {
  logger.info('Processing Add Bill request', { body: req.body, traceId })

  try {
    const { name, amount, dueDate } = req.body

    // Validate due date is not in the past
    if (!isDateInFuture(dueDate)) {
      logger.warn('Bill creation failed: due date is in the past', { dueDate, traceId })
      return {
        status: 400,
        body: {
          error: 'INVALID_DUE_DATE',
          message: 'Due date cannot be in the past',
          details: [`Provided due date: ${dueDate}`],
        },
      }
    }

    // Generate unique bill ID
    const billId = generateBillId()
    const timestamp = getCurrentTimestamp()

    // Create bill record
    const bill: Bill = {
      id: billId,
      name,
      amount,
      dueDate,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    // Validate the bill against schema
    const validationResult = billSchema.safeParse(bill)
    if (!validationResult.success) {
      logger.error('Bill validation failed', { 
        bill, 
        errors: validationResult.error.errors,
        traceId 
      })
      return {
        status: 400,
        body: {
          error: 'VALIDATION_ERROR',
          message: 'Bill data validation failed',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        },
      }
    }

    // Store bill in state
    await state.set(STATE_KEYS.BILLS, billId, bill)
    logger.info('Bill created and stored', { billId, bill, traceId })

    // Emit bill.created event
    await emit({
      topic: EVENT_TOPICS.BILL_CREATED,
      data: {
        bill,
        timestamp,
      },
    })

    logger.info('Bill created successfully', { billId, traceId })

    return {
      status: 200,
      body: bill,
    }
  } catch (error) {
    logger.error('Unexpected error creating bill', { error, traceId })
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while creating the bill',
      },
    }
  }
}