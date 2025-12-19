import { CronConfig } from 'motia'
import { 
  Bill,
  DailySummary,
  EVENT_TOPICS,
  STATE_KEYS,
  CRON_SCHEDULES,
  getCurrentDate,
  getCurrentTimestamp,
  calculateDaysOverdue
} from '../index'

export const config: CronConfig = {
  type: 'cron',
  cron: CRON_SCHEDULES.DAILY_SUMMARY, // Daily at 1 AM
  name: 'DailySummaryGenerator',
  description: 'Daily cron job that generates summary statistics for all bills and emits summary events',
  flows: ['payguard'],
  emits: [EVENT_TOPICS.DAILY_SUMMARY_GENERATED],
}

export const handler = async ({ logger, state, emit }: any) => {
  const timestamp = getCurrentTimestamp()
  const currentDate = getCurrentDate()
  
  logger.info('Starting daily summary generation', { currentDate, timestamp })

  try {
    // Retrieve all bills from state
    const bills = await state.getGroup(STATE_KEYS.BILLS) as Bill[]
    logger.info('Retrieved bills for summary calculation', { billCount: bills.length, currentDate })

    // Initialize counters
    let totalBills = 0
    let overdueBills = 0
    let criticalBills = 0
    let totalAmount = 0
    let overdueAmount = 0

    // Process each bill
    for (const bill of bills) {
      // Skip paid bills in counts but include in total amount
      if (bill.status === 'paid') {
        totalAmount += bill.amount
        continue
      }

      // Count active bills (pending or overdue)
      totalBills++
      totalAmount += bill.amount

      // Check if bill is overdue
      const daysOverdue = calculateDaysOverdue(bill.dueDate)
      
      if (daysOverdue > 0) {
        overdueBills++
        overdueAmount += bill.amount

        // Check if bill is critical (>3 days overdue)
        if (daysOverdue > 3) {
          criticalBills++
        }

        logger.debug('Processed overdue bill for summary', {
          billId: bill.id,
          daysOverdue,
          amount: bill.amount,
          isCritical: daysOverdue > 3
        })
      }
    }

    // Create daily summary
    const summary: DailySummary = {
      date: currentDate,
      totalBills,
      overdue: overdueBills,
      critical: criticalBills,
      totalAmount,
      overdueAmount,
    }

    logger.info('Generated daily summary', {
      summary,
      currentDate,
      timestamp
    })

    // Emit daily.summary.generated event
    await emit({
      topic: EVENT_TOPICS.DAILY_SUMMARY_GENERATED,
      data: {
        summary,
        timestamp,
      },
    })

    logger.info('Daily summary event emitted successfully', {
      summary,
      currentDate,
      timestamp
    })

  } catch (error) {
    logger.error('Error during daily summary generation', { error, currentDate, timestamp })
    throw error // Re-throw to trigger retry mechanisms
  }
}