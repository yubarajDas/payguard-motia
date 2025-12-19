import { ApiRouteConfig } from 'motia'
import { 
  Bill,
  STATE_KEYS,
  API_PATHS,
  calculateDaysOverdue
} from '../index'

export const config: ApiRouteConfig = {
  type: 'api',
  method: 'GET',
  path: API_PATHS.GET_SUMMARY,
  name: 'GetSummary',
  description: 'Retrieves dashboard summary statistics',
  flows: ['payguard'],
  emits: [],
}

export const handler = async (input: any, { logger, state }: any) => {
  logger.info('Generating dashboard summary')

  try {
    // Get all bills from state
    const bills = await state.getGroup(STATE_KEYS.BILLS) as Bill[]
    
    // Calculate summary statistics
    let totalBills = 0
    let overdueBills = 0
    let criticalBills = 0
    let totalAmount = 0
    let overdueAmount = 0
    let dueSoonBills = 0 // Due in next 7 days

    const currentDate = new Date()
    const sevenDaysFromNow = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    for (const bill of bills) {
      // Include all bills in total amount
      totalAmount += bill.amount

      // Skip paid bills for active counts
      if (bill.status === 'paid') {
        continue
      }

      // Count active bills
      totalBills++

      const billDueDate = new Date(bill.dueDate)
      const daysOverdue = calculateDaysOverdue(bill.dueDate)

      // Check if overdue
      if (daysOverdue > 0) {
        overdueBills++
        overdueAmount += bill.amount

        // Check if critical (>3 days overdue)
        if (daysOverdue > 3) {
          criticalBills++
        }
      }

      // Check if due soon (next 7 days)
      if (billDueDate >= currentDate && billDueDate <= sevenDaysFromNow) {
        dueSoonBills++
      }
    }

    // Get recent bills (last 5 created)
    const recentBills = bills
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const summary = {
      totalBills,
      overdueBills,
      criticalBills,
      dueSoonBills,
      totalAmount,
      overdueAmount,
      recentBills,
      lastUpdated: new Date().toISOString(),
    }

    logger.info('Generated summary successfully', summary)

    return {
      status: 200,
      body: summary,
    }

  } catch (error) {
    logger.error('Error generating summary', { error })
    
    return {
      status: 500,
      body: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate summary',
      },
    }
  }
}