import fc from 'fast-check'
import { handler, config } from './escalation-engine.step'
import { 
  BillOverdueEvent, 
  Bill, 
  EscalationEvaluateEvent,
  EVENT_TOPICS,
  calculateEscalationLevel
} from '../index'

// **Feature: payguard, Property 16: Escalation level calculation**
// **Feature: payguard, Property 17: Escalation event emission**

describe('Escalation Engine Property Tests', () => {
  
  // Mock dependencies
  const createMockContext = () => {
    const emittedEvents: any[] = []
    
    return {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      emit: jest.fn(async (event) => {
        emittedEvents.push(event)
      }),
      emittedEvents,
    }
  }

  // Generators for property-based testing
  const billArb = fc.record({
    id: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000 }),
    dueDate: fc.string().map(() => '2025-01-01'), // Fixed date for testing
    status: fc.constantFrom('pending', 'overdue', 'paid'),
    createdAt: fc.string().map(() => new Date().toISOString()),
    updatedAt: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<Bill>

  const daysOverdueArb = fc.integer({ min: 0, max: 10 })

  const billOverdueEventArb = fc.record({
    bill: billArb,
    daysOverdue: daysOverdueArb,
    timestamp: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<BillOverdueEvent>

  // Property 16: Escalation level calculation
  test('Property 16: Escalation level calculation', async () => {
    await fc.assert(
      fc.asyncProperty(billOverdueEventArb, async (billOverdueEvent) => {
        const mockContext = createMockContext()
        
        // Process the bill overdue event
        await (handler as any)(
          billOverdueEvent,
          mockContext
        )

        // Verify escalation.evaluate event was emitted
        expect(mockContext.emit).toHaveBeenCalledTimes(1)
        
        const emittedEvent = mockContext.emittedEvents[0]
        expect(emittedEvent.topic).toBe(EVENT_TOPICS.ESCALATION_EVALUATE)
        
        const escalationEvent = emittedEvent.data as EscalationEvaluateEvent
        
        // Verify escalation level calculation is correct
        const expectedLevel = calculateEscalationLevel(billOverdueEvent.daysOverdue)
        expect(escalationEvent.escalationContext.level).toBe(expectedLevel)
        
        // Verify escalation context contains correct data
        expect(escalationEvent.escalationContext.billId).toBe(billOverdueEvent.bill.id)
        expect(escalationEvent.escalationContext.daysOverdue).toBe(billOverdueEvent.daysOverdue)
        expect(escalationEvent.bill).toEqual(billOverdueEvent.bill)
        
        // Verify escalation level follows the rules:
        // 0 days: INFO, 1-3 days: WARNING, >3 days: CRITICAL
        if (billOverdueEvent.daysOverdue === 0) {
          expect(escalationEvent.escalationContext.level).toBe('INFO')
        } else if (billOverdueEvent.daysOverdue >= 1 && billOverdueEvent.daysOverdue <= 3) {
          expect(escalationEvent.escalationContext.level).toBe('WARNING')
        } else if (billOverdueEvent.daysOverdue > 3) {
          expect(escalationEvent.escalationContext.level).toBe('CRITICAL')
        }
      }),
      { numRuns: 100 }
    )
  })

  // Property 17: Escalation event emission
  test('Property 17: Escalation event emission', async () => {
    await fc.assert(
      fc.asyncProperty(billOverdueEventArb, async (billOverdueEvent) => {
        const mockContext = createMockContext()
        
        // Process the bill overdue event
        await (handler as any)(
          billOverdueEvent,
          mockContext
        )

        // Verify exactly one escalation.evaluate event was emitted
        expect(mockContext.emit).toHaveBeenCalledTimes(1)
        expect(mockContext.emittedEvents).toHaveLength(1)
        
        const emittedEvent = mockContext.emittedEvents[0]
        expect(emittedEvent.topic).toBe(EVENT_TOPICS.ESCALATION_EVALUATE)
        
        // Verify event data structure
        const escalationEvent = emittedEvent.data as EscalationEvaluateEvent
        expect(escalationEvent).toHaveProperty('escalationContext')
        expect(escalationEvent).toHaveProperty('bill')
        expect(escalationEvent).toHaveProperty('timestamp')
        
        // Verify escalation context structure
        expect(escalationEvent.escalationContext).toHaveProperty('billId')
        expect(escalationEvent.escalationContext).toHaveProperty('daysOverdue')
        expect(escalationEvent.escalationContext).toHaveProperty('level')
        expect(escalationEvent.escalationContext).toHaveProperty('timestamp')
        
        // Verify bill data is preserved
        expect(escalationEvent.bill).toEqual(billOverdueEvent.bill)
      }),
      { numRuns: 100 }
    )
  })

  // Test specific escalation level boundaries
  test('Escalation level boundaries are correct', async () => {
    const testCases = [
      { daysOverdue: 0, expectedLevel: 'INFO' },
      { daysOverdue: 1, expectedLevel: 'WARNING' },
      { daysOverdue: 2, expectedLevel: 'WARNING' },
      { daysOverdue: 3, expectedLevel: 'WARNING' },
      { daysOverdue: 4, expectedLevel: 'CRITICAL' },
      { daysOverdue: 10, expectedLevel: 'CRITICAL' },
    ]

    for (const testCase of testCases) {
      const mockContext = createMockContext()
      
      const billOverdueEvent: BillOverdueEvent = {
        bill: {
          id: 'bill_test',
          name: 'Test Bill',
          amount: 100,
          dueDate: '2025-01-01',
          status: 'overdue',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        daysOverdue: testCase.daysOverdue,
        timestamp: new Date().toISOString(),
      }

      await (handler as any)(
        billOverdueEvent,
        mockContext
      )

      const emittedEvent = mockContext.emittedEvents[0]
      const escalationEvent = emittedEvent.data as EscalationEvaluateEvent
      
      expect(escalationEvent.escalationContext.level).toBe(testCase.expectedLevel)
    }
  })
})