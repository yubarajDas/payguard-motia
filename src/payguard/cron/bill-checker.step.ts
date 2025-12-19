import { CronConfig, Handlers } from 'motia'
import { 
  Bill,
  EVENT_TOPICS,
  STATE_KEYS,
  CRON_SCHEDULES,
  getCurrentDate,
  getCurrentTimestamp,
  calculateDaysOverdue
} from '../index'

export const config: CronConfig = {
  type: 'cron',
  cron: CRON_SCHEDULES.BILL_CHECKER, // Daily at midnight
  name: 'BillChecker',
  description: 'Daily cron job that checks all bills for overdue status and emits appropriate events',
  flows: ['payguard'],
  emits: [EVENT_TOPICS.BILL_OVERDUE],
}

export const handler: Handlers['BillChecker'] = async ({ logger, state, emit }) => {
  const timestamp = getCurrentTimestamp()
  const currentDate = getCurrentDate()
  
  logger.info('Starting daily bill checker', { currentDate, timestamp })

  try {
    // Retrieve all bills from state
    const bills = await state.getGroup<Bill>(STATE_KEYS.BILLS)
    logger.info('Retrieved bills for checking', { billCount: bills.length, currentDate })

    let checkedCount = 0
    let overdueCount = 0
    let updatedCount = 0

    for (const bill of bills) {
      checkedCount++
      
      // Skip bills that are already paid
      if (bill.status === 'paid') {
        continue
      }

      // Check if bill is overdue
      const daysOverdue = calculateDaysOverdue(bill.dueDate)
      
      if (daysOverdue > 0) {
        overdueCount++
        logger.info('Found overdue bill', { 
          billId: bill.id, 
          billName: bill.name,
          dueDate: bill.dueDate, 
          daysOverdue,
          currentStatus: bill.status
        })

        // Update bill status to overdue if it's currently pending
        if (bill.status === 'pending') {
          const updatedBill: Bill = {
            ...bill,
            status: 'overdue',
            updatedAt: timestamp,
          }

          // Store updated bill
          await state.set(STATE_KEYS.BILLS, bill.id, updatedBill)
          updatedCount++
          
          logger.info('Updated bill status to overdue', { 
            billId: bill.id,
            previousStatus: bill.status,
            newStatus: 'overdue'
          })

          // Emit bill.overdue event
          await emit({
            topic: EVENT_TOPICS.BILL_OVERDUE,
            data: {
              bill: updatedBill,
              daysOverdue,
              timestamp,
            },
          })

          logger.info('Emitted bill.overdue event', { 
            billId: bill.id,
            daysOverdue,
            timestamp
          })
        } else if (bill.status === 'overdue') {
          // Bill is already marked as overdue, just emit the event with current days overdue
          await emit({
            topic: EVENT_TOPICS.BILL_OVERDUE,
            data: {
              bill,
              daysOverdue,
              timestamp,
            },
          })

          logger.info('Emitted bill.overdue event for existing overdue bill', { 
            billId: bill.id,
            daysOverdue,
            timestamp
          })
        }
      } else {
        logger.debug('Bill is not overdue', { 
          billId: bill.id,
          dueDate: bill.dueDate,
          currentDate,
          status: bill.status
        })
      }
    }

    logger.info('Completed daily bill checker', { 
      checkedCount,
      overdueCount,
      updatedCount,
      currentDate,
      timestamp
    })

  } catch (error) {
    logger.error('Error during bill checking', { error, currentDate, timestamp })
    throw error // Re-throw to trigger retry mechanisms
  }
}