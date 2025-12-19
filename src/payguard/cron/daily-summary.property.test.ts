import fc from 'fast-check'
import { handler, config } from './daily-summary.step'
import { 
  Bill,
  DailySummary,
  DailySummaryGeneratedEvent,
  EVENT_TOPICS,
  STATE_KEYS,
  calculateDaysOverdue
} from '../index'

// **Feature: payguard, Property 18: Daily summary calculation accuracy**
// **Feature: payguard, Property 19: Summary event emission**
// **Feature: payguard, Property 20: Summary data completeness**

describe('Daily Summary Generator Property Tests', () => {
  
  // Mock dependencies
  const createMockContext = (bills: Bill[] = []) => {
    const emittedEvents: any[] = []
    const stateStore = new Map<string, Map<string, any>>()
    
    // Pre-populate state with bills
    const billsMap = new Map<string, Bill>()
    bills.forEach(bill => billsMap.set(bill.id, bill))
    stateStore.set(STATE_KEYS.BILLS, billsMap)
    
    return {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      emit: jest.fn(async (event) => {
        emittedEvents.push(event)
      }),
      state: {
        getGroup: jest.fn(async (key: string) => {
          const group = stateStore.get(key)
          return group ? Array.from(group.values()) : []
        }),
      },
      emittedEvents,
      stateStore,
    }
  }

  // Generators for property-based testing
  const pastDateArb = fc.integer({ min: 1, max: 30 })
    .map(daysAgo => {
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      return date.toISOString().split('T')[0]
    })

  const futureDateArb = fc.integer({ min: 1, max: 30 })
    .map(daysFromNow => {
      const date = new Date()
      date.setDate(date.getDate() + daysFromNow)
      return date.toISOString().split('T')[0]
    })

  const todayDateArb = fc.constant(new Date().toISOString().split('T')[0])

  const billArb = fc.record({
    id: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000 }),
    dueDate: fc.oneof(pastDateArb, futureDateArb, todayDateArb),
    status: fc.constantFrom('pending', 'overdue', 'paid'),
    createdAt: fc.string().map(() => new Date().toISOString()),
    updatedAt: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<Bill>

  const billsArrayArb = fc.array(billArb, { minLength: 0, maxLength: 20 })

  // Property 18: Daily summary calculation accuracy
  test('Property 18: Daily summary calculation accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(billsArrayArb, async (bills) => {
        const mockContext = createMockContext(bills)
        
        // Execute the daily summary generator
        await (handler as any)(mockContext)

        // Verify summary event was emitted
        expect(mockContext.emit).toHaveBeenCalledTimes(1)
        
        const emittedEvent = mockContext.emittedEvents[0]
        expect(emittedEvent.topic).toBe(EVENT_TOPICS.DAILY_SUMMARY_GENERATED)
        
        const summaryEvent = emittedEvent.data as DailySummaryGeneratedEvent
        const summary = summaryEvent.summary

        // Calculate expected values manually
        let expectedTotalBills = 0
        let expectedOverdueBills = 0
        let expectedCriticalBills = 0
        let expectedTotalAmount = 0
        let expectedOverdueAmount = 0

        for (const bill of bills) {
          // Include all bills in total amount
          expectedTotalAmount += bill.amount

          // Skip paid bills for active counts
          if (bill.status === 'paid') {
            continue
          }

          // Count active bills
          expectedTotalBills++

          // Check if overdue
          const daysOverdue = calculateDaysOverdue(bill.dueDate)
          if (daysOverdue > 0) {
            expectedOverdueBills++
            expectedOverdueAmount += bill.amount

            // Check if critical
            if (daysOverdue > 3) {
              expectedCriticalBills++
            }
          }
        }

        // Verify calculations are correct
        expect(summary.totalBills).toBe(expectedTotalBills)
        expect(summary.overdue).toBe(expectedOverdueBills)
        expect(summary.critical).toBe(expectedCriticalBills)
        expect(summary.totalAmount).toBe(expectedTotalAmount)
        expect(summary.overdueAmount).toBe(expectedOverdueAmount)

        // Verify logical constraints
        expect(summary.overdue).toBeLessThanOrEqual(summary.totalBills)
        expect(summary.critical).toBeLessThanOrEqual(summary.overdue)
        expect(summary.overdueAmount).toBeLessThanOrEqual(summary.totalAmount)
      }),
      { numRuns: 100 }
    )
  })

  // Property 19: Summary event emission
  test('Property 19: Summary event emission', async () => {
    await fc.assert(
      fc.asyncProperty(billsArrayArb, async (bills) => {
        const mockContext = createMockContext(bills)
        
        // Execute the daily summary generator
        await (handler as any)(mockContext)

        // Verify exactly one daily.summary.generated event was emitted
        expect(mockContext.emit).toHaveBeenCalledTimes(1)
        expect(mockContext.emittedEvents).toHaveLength(1)
        
        const emittedEvent = mockContext.emittedEvents[0]
        expect(emittedEvent.topic).toBe(EVENT_TOPICS.DAILY_SUMMARY_GENERATED)
        
        // Verify event data structure
        const summaryEvent = emittedEvent.data as DailySummaryGeneratedEvent
        expect(summaryEvent).toHaveProperty('summary')
        expect(summaryEvent).toHaveProperty('timestamp')
      }),
      { numRuns: 100 }
    )
  })

  // Property 20: Summary data completeness
  test('Property 20: Summary data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(billsArrayArb, async (bills) => {
        const mockContext = createMockContext(bills)
        
        // Execute the daily summary generator
        await (handler as any)(mockContext)

        const emittedEvent = mockContext.emittedEvents[0]
        const summaryEvent = emittedEvent.data as DailySummaryGeneratedEvent
        const summary = summaryEvent.summary

        // Verify all required summary fields are present
        expect(summary).toHaveProperty('date')
        expect(summary).toHaveProperty('totalBills')
        expect(summary).toHaveProperty('overdue')
        expect(summary).toHaveProperty('critical')
        expect(summary).toHaveProperty('totalAmount')
        expect(summary).toHaveProperty('overdueAmount')

        // Verify data types and constraints
        expect(typeof summary.date).toBe('string')
        expect(summary.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
        expect(typeof summary.totalBills).toBe('number')
        expect(summary.totalBills).toBeGreaterThanOrEqual(0)
        expect(typeof summary.overdue).toBe('number')
        expect(summary.overdue).toBeGreaterThanOrEqual(0)
        expect(typeof summary.critical).toBe('number')
        expect(summary.critical).toBeGreaterThanOrEqual(0)
        expect(typeof summary.totalAmount).toBe('number')
        expect(summary.totalAmount).toBeGreaterThanOrEqual(0)
        expect(typeof summary.overdueAmount).toBe('number')
        expect(summary.overdueAmount).toBeGreaterThanOrEqual(0)

        // Verify timestamp is present and valid
        expect(summaryEvent.timestamp).toBeDefined()
        expect(typeof summaryEvent.timestamp).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  // Test edge cases
  test('Empty bills collection produces zero summary', async () => {
    const mockContext = createMockContext([])
    
    await (handler as any)(mockContext)

    const emittedEvent = mockContext.emittedEvents[0]
    const summaryEvent = emittedEvent.data as DailySummaryGeneratedEvent
    const summary = summaryEvent.summary

    expect(summary.totalBills).toBe(0)
    expect(summary.overdue).toBe(0)
    expect(summary.critical).toBe(0)
    expect(summary.totalAmount).toBe(0)
    expect(summary.overdueAmount).toBe(0)
  })

  test('Only paid bills produces zero active counts', async () => {
    const paidBills: Bill[] = [
      {
        id: 'bill_1',
        name: 'Paid Bill 1',
        amount: 100,
        dueDate: '2024-12-01',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bill_2',
        name: 'Paid Bill 2',
        amount: 200,
        dueDate: '2024-12-15',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const mockContext = createMockContext(paidBills)
    
    await (handler as any)(mockContext)

    const emittedEvent = mockContext.emittedEvents[0]
    const summaryEvent = emittedEvent.data as DailySummaryGeneratedEvent
    const summary = summaryEvent.summary

    expect(summary.totalBills).toBe(0)
    expect(summary.overdue).toBe(0)
    expect(summary.critical).toBe(0)
    expect(summary.totalAmount).toBe(300) // Still counts paid amounts
    expect(summary.overdueAmount).toBe(0)
  })
})