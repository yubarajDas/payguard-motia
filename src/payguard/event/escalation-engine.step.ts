import { EventConfig, Handlers } from 'motia'
import { 
  BillOverdueEvent,
  EscalationContext,
  EVENT_TOPICS,
  calculateEscalationLevel,
  getCurrentTimestamp
} from '../index'

export const config: EventConfig = {
  type: 'event',
  name: 'EscalationEngine',
  description: 'Evaluates escalation levels for overdue bills and emits escalation events',
  flows: ['payguard'],
  subscribes: [EVENT_TOPICS.BILL_OVERDUE],
  emits: [EVENT_TOPICS.ESCALATION_EVALUATE],
}

export const handler = async (input: any, { logger, emit }: any) => {
  const timestamp = getCurrentTimestamp()
  const billOverdueEvent = input as BillOverdueEvent
  
  logger.info('Processing bill overdue event for escalation', { 
    billId: billOverdueEvent.bill.id,
    daysOverdue: billOverdueEvent.daysOverdue,
    timestamp
  })

  try {
    // Calculate escalation level based on days overdue
    const escalationLevel = calculateEscalationLevel(billOverdueEvent.daysOverdue)
    
    // Create escalation context
    const escalationContext: EscalationContext = {
      billId: billOverdueEvent.bill.id,
      daysOverdue: billOverdueEvent.daysOverdue,
      level: escalationLevel,
      timestamp,
    }

    logger.info('Calculated escalation level', {
      billId: billOverdueEvent.bill.id,
      daysOverdue: billOverdueEvent.daysOverdue,
      escalationLevel,
      timestamp
    })

    // Emit escalation.evaluate event
    await emit({
      topic: EVENT_TOPICS.ESCALATION_EVALUATE,
      data: {
        escalationContext,
        bill: billOverdueEvent.bill,
        timestamp,
      },
    })

    logger.info('Emitted escalation.evaluate event', {
      billId: billOverdueEvent.bill.id,
      escalationLevel,
      daysOverdue: billOverdueEvent.daysOverdue,
      timestamp
    })

  } catch (error) {
    logger.error('Error processing escalation evaluation', { 
      error,
      billId: billOverdueEvent.bill.id,
      daysOverdue: billOverdueEvent.daysOverdue,
      timestamp
    })
    throw error // Re-throw to trigger retry mechanisms
  }
}