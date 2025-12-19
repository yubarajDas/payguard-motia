import { ApiRouteConfig } from 'motia'
import { 
  Bill,
  STATE_KEYS,
  API_PATHS
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  method: 'GET',
  path: API_PATHS.GET_BILLS,
  name: 'GetBills',
  description: 'Retrieves all bills from the system',
  flows: ['payguard'],
  emits: [],
}

export const handler = async (input: any, { logger, state }: any) => {
  logger.info('Retrieving all bills')

  try {
    // Get all bills from state
    const bills = await state.getGroup(STATE_KEYS.BILLS) as Bill[]
    
    logger.info('Retrieved bills successfully', { 
      billCount: bills.length 
    })

    return {
      status: 200,
      body: {
        bills,
        total: bills.length,
        timestamp: new Date().toISOString(),
      },
    }

  } catch (error) {
    logger.error('Error retrieving bills', { error })
    
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve bills',
      },
    }
  }
}