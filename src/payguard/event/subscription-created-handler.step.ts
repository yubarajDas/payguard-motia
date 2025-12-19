import { EventConfig } from 'motia'
import { 
  SubscriptionCreatedEvent,
  EVENT_TOPICS,
  getCurrentTimestamp
} from '../index'

export const config: EventConfig = {
  type: 'event',
  name: 'SubscriptionCreatedHandler',
  description: 'Handles subscription.created events to initialize renewal tracking and calculate next renewal dates',
  flows: ['payguard'],
  subscribes: [EVENT_TOPICS.SUBSCRIPTION_CREATED],
  emits: [],
}

export const handler = async (input: any, { logger, traceId }: any) => {
  const timestamp = getCurrentTimestamp()
  const subscriptionCreatedEvent = input as SubscriptionCreatedEvent
  
  logger.info('Processing subscription.created event', { 
    subscriptionId: subscriptionCreatedEvent.subscription.id,
    subscriptionName: subscriptionCreatedEvent.subscription.name,
    renewalDay: subscriptionCreatedEvent.subscription.renewalDay,
    traceId,
    timestamp
  })

  try {
    // Initialize renewal tracking for the new subscription
    logger.info('Initializing renewal tracking for new subscription', {
      subscriptionId: subscriptionCreatedEvent.subscription.id,
      renewalDay: subscriptionCreatedEvent.subscription.renewalDay,
      traceId,
      timestamp
    })

    // Calculate next renewal date based on renewalDay
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const renewalDay = subscriptionCreatedEvent.subscription.renewalDay
    
    // Calculate next renewal date
    let nextRenewalDate = new Date(currentYear, currentMonth, renewalDay)
    
    // If the renewal day has already passed this month, move to next month
    if (nextRenewalDate <= currentDate) {
      nextRenewalDate = new Date(currentYear, currentMonth + 1, renewalDay)
    }
    
    // Handle edge case where renewal day doesn't exist in the target month (e.g., Feb 31)
    if (nextRenewalDate.getDate() !== renewalDay) {
      // Set to last day of the month
      nextRenewalDate = new Date(nextRenewalDate.getFullYear(), nextRenewalDate.getMonth() + 1, 0)
    }
    
    const nextRenewalDateString = nextRenewalDate.toISOString().split('T')[0]

    logger.info('Calculated next renewal date', {
      subscriptionId: subscriptionCreatedEvent.subscription.id,
      renewalDay,
      nextRenewalDate: nextRenewalDateString,
      currentDate: currentDate.toISOString().split('T')[0],
      traceId,
      timestamp
    })

    // In a real implementation, this would:
    // 1. Store the renewal schedule
    // 2. Set up recurring bill generation
    // 3. Configure renewal notifications

    // Log subscription creation for audit trail
    logger.info('Subscription creation processed successfully', {
      subscriptionId: subscriptionCreatedEvent.subscription.id,
      subscriptionName: subscriptionCreatedEvent.subscription.name,
      amount: subscriptionCreatedEvent.subscription.amount,
      renewalDay: subscriptionCreatedEvent.subscription.renewalDay,
      isActive: subscriptionCreatedEvent.subscription.isActive,
      nextRenewalDate: nextRenewalDateString,
      createdAt: subscriptionCreatedEvent.subscription.createdAt,
      traceId,
      timestamp,
      auditAction: 'SUBSCRIPTION_CREATED_PROCESSED'
    })

  } catch (error) {
    logger.error('Error processing subscription created event', { 
      error,
      subscriptionId: subscriptionCreatedEvent.subscription.id,
      traceId,
      timestamp
    })
    throw error // Re-throw to trigger retry mechanisms
  }
}