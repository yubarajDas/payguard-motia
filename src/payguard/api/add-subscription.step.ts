import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { 
  createSubscriptionRequestSchema, 
  subscriptionSchema, 
  Subscription,
  EVENT_TOPICS,
  STATE_KEYS,
  generateSubscriptionId,
  getCurrentTimestamp
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AddSubscription',
  description: 'API endpoint to register new subscriptions in the PayGuard system',
  flows: ['payguard'],
  method: 'POST',
  path: '/payguard/subscriptions',
  bodySchema: createSubscriptionRequestSchema,
  responseSchema: {
    200: subscriptionSchema,
    400: z.object({
      error: z.string(),
      message: z.string(),
      details: z.array(z.string()).optional(),
    }),
  },
  emits: [EVENT_TOPICS.SUBSCRIPTION_CREATED],
}

export const handler: Handlers['AddSubscription'] = async (req, { logger, traceId, emit, state }) => {
  logger.info('Processing Add Subscription request', { body: req.body, traceId })

  try {
    const { name, amount, renewalDay } = req.body

    // Validate renewal day is between 1 and 31
    if (renewalDay < 1 || renewalDay > 31) {
      logger.warn('Subscription creation failed: invalid renewal day', { renewalDay, traceId })
      return {
        status: 400,
        body: {
          error: 'INVALID_RENEWAL_DAY',
          message: 'Renewal day must be between 1 and 31',
          details: [`Provided renewal day: ${renewalDay}`],
        },
      }
    }

    // Generate unique subscription ID
    const subscriptionId = generateSubscriptionId()
    const timestamp = getCurrentTimestamp()

    // Create subscription record
    const subscription: Subscription = {
      id: subscriptionId,
      name,
      amount,
      renewalDay,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    // Validate the subscription against schema
    const validationResult = subscriptionSchema.safeParse(subscription)
    if (!validationResult.success) {
      logger.error('Subscription validation failed', { 
        subscription, 
        errors: validationResult.error.errors,
        traceId 
      })
      return {
        status: 400,
        body: {
          error: 'VALIDATION_ERROR',
          message: 'Subscription data validation failed',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        },
      }
    }

    // Store subscription in state
    await state.set(STATE_KEYS.SUBSCRIPTIONS, subscriptionId, subscription)
    logger.info('Subscription created and stored', { subscriptionId, subscription, traceId })

    // Emit subscription.created event
    await emit({
      topic: EVENT_TOPICS.SUBSCRIPTION_CREATED,
      data: {
        subscription,
        timestamp,
      },
    })

    logger.info('Subscription created successfully', { subscriptionId, traceId })

    return {
      status: 200,
      body: subscription,
    }
  } catch (error) {
    logger.error('Unexpected error creating subscription', { error, traceId })
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while creating the subscription',
      },
    }
  }
}