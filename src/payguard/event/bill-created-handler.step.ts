import { EventConfig } from 'motia'
import { 
  BillCreatedEvent,
  EVENT_TOPICS,
  DEFAULT_REMINDER_POLICY,
  getCurrentTimestamp
} from '../index'

export const config: EventConfig = {
  type: 'event',
  name: 'BillCreatedHandler',
  description: 'Handles bill.created events to initialize reminder tracking and apply default policies',
  flows: ['payguard'],
  subscribes: [EVENT_TOPICS.BILL_CREATED],
  emits: [],
}

export const handler = async (input: any, { logger, traceId }: any) => {
  const timestamp = getCurrentTimestamp()
  const billCreatedEvent = input as BillCreatedEvent
  
  logger.info('Processing bill.created event', { 
    billId: billCreatedEvent.bill.id,
    billName: billCreatedEvent.bill.name,
    dueDate: billCreatedEvent.bill.dueDate,
    traceId,
    timestamp
  })

  try {
    // Initialize reminder tracking for the new bill
    logger.info('Initializing reminder tracking for new bill', {
      billId: billCreatedEvent.bill.id,
      defaultPolicy: DEFAULT_REMINDER_POLICY,
      traceId,
      timestamp
    })

    // Apply default reminder policies
    // In a real implementation, this would:
    // 1. Store the bill-policy association
    // 2. Calculate reminder schedules
    // 3. Set up notification timers
    
    logger.info('Applied default reminder policies', {
      billId: billCreatedEvent.bill.id,
      notifyBeforeDays: DEFAULT_REMINDER_POLICY.notifyBeforeDays,
      notifyOnDueDate: DEFAULT_REMINDER_POLICY.notifyOnDueDate,
      repeatOverdueDaily: DEFAULT_REMINDER_POLICY.repeatOverdueDaily,
      traceId,
      timestamp
    })

    // Log bill creation for audit trail
    logger.info('Bill creation processed successfully', {
      billId: billCreatedEvent.bill.id,
      billName: billCreatedEvent.bill.name,
      amount: billCreatedEvent.bill.amount,
      dueDate: billCreatedEvent.bill.dueDate,
      status: billCreatedEvent.bill.status,
      createdAt: billCreatedEvent.bill.createdAt,
      traceId,
      timestamp,
      auditAction: 'BILL_CREATED_PROCESSED'
    })

  } catch (error) {
    logger.error('Error processing bill created event', { 
      error,
      billId: billCreatedEvent.bill.id,
      traceId,
      timestamp
    })
    throw error // Re-throw to trigger retry mechanisms
  }
}