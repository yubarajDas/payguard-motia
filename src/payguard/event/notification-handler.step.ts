import { EventConfig } from 'motia'
import { 
  EscalationEvaluateEvent,
  EVENT_TOPICS,
  getCurrentTimestamp
} from '../index'

export const config: EventConfig = {
  type: 'event',
  name: 'NotificationHandler',
  description: 'Processes escalation and reminder events to send notifications',
  flows: ['payguard'],
  subscribes: [EVENT_TOPICS.ESCALATION_EVALUATE],
  emits: [EVENT_TOPICS.NOTIFICATION_SEND],
}

export const handler = async (input: any, { logger, emit, traceId }: any) => {
  const timestamp = getCurrentTimestamp()
  const escalationEvent = input as EscalationEvaluateEvent
  
  logger.info('Processing escalation event for notification', { 
    billId: escalationEvent.bill.id,
    escalationLevel: escalationEvent.escalationContext.level,
    daysOverdue: escalationEvent.escalationContext.daysOverdue,
    traceId,
    timestamp
  })

  try {
    // Determine message template based on escalation level
    let messageTemplate: string
    let recipient = 'user@example.com' // In real implementation, this would come from bill owner

    switch (escalationEvent.escalationContext.level) {
      case 'INFO':
        messageTemplate = 'bill_due_today'
        break
      case 'WARNING':
        messageTemplate = 'bill_overdue_warning'
        break
      case 'CRITICAL':
        messageTemplate = 'bill_overdue_critical'
        break
      default:
        messageTemplate = 'bill_overdue_generic'
    }

    // Create context data for the notification
    const contextData = {
      billId: escalationEvent.bill.id,
      billName: escalationEvent.bill.name,
      amount: escalationEvent.bill.amount,
      dueDate: escalationEvent.bill.dueDate,
      daysOverdue: escalationEvent.escalationContext.daysOverdue,
      escalationLevel: escalationEvent.escalationContext.level,
      status: escalationEvent.bill.status,
    }

    logger.info('Sending notification', {
      billId: escalationEvent.bill.id,
      recipient,
      messageTemplate,
      escalationLevel: escalationEvent.escalationContext.level,
      traceId,
      timestamp
    })

    // Emit notification.send event
    await emit({
      topic: EVENT_TOPICS.NOTIFICATION_SEND,
      data: {
        recipient,
        messageTemplate,
        contextData,
        timestamp,
        traceId,
      },
    })

    logger.info('Notification event emitted successfully', {
      billId: escalationEvent.bill.id,
      recipient,
      messageTemplate,
      traceId,
      timestamp
    })

  } catch (error) {
    logger.error('Error processing notification handler', { 
      error,
      billId: escalationEvent.bill.id,
      escalationLevel: escalationEvent.escalationContext.level,
      traceId,
      timestamp
    })
    throw error // Re-throw to trigger retry mechanisms
  }
}