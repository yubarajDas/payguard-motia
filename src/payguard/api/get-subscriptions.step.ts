import { ApiRouteConfig } from 'motia'
import { 
  Subscription,
  STATE_KEYS,
  API_PATHS
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  method: 'GET',
  path: API_PATHS.GET_SUBSCRIPTIONS,
  name: 'GetSubscriptions',
  description: 'Retrieves all subscriptions from the system',
  flows: ['payguard'],
  emits: [],
}

export const handler = async (input: any, { logger, state }: any) => {
  logger.info('Retrieving all subscriptions')

  try {
    // Get all subscriptions from state
    const subscriptions = await state.getGroup(STATE_KEYS.SUBSCRIPTIONS) as Subscription[]
    
    logger.info('Retrieved subscriptions successfully', { 
      subscriptionCount: subscriptions.length 
    })

    return {
      status: 200,
      body: {
        subscriptions,
        total: subscriptions.length,
        timestamp: new Date().toISOString(),
      },
    }

  } catch (error) {
    logger.error('Error retrieving subscriptions', { error })
    
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve subscriptions',
      },
    }
  }
}