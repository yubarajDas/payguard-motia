import fc from 'fast-check'
import { handler, config } from './notification-handler.step'
import { 
  EscalationEvaluateEvent,
  Bill, 
  EscalationContext,
  NotificationSendEvent,
  EVENT_TOPICS
} from '../index'

// **Feature: payguard, Property 21: Notification event emission consistency**
// **Feature: payguard, Property 22: Notification event data completeness**
// **Feature: payguard, Property 23: Event traceability**

describe('Notification Handler Property Tests', () => {
  
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
      traceId: `trace_${Math.random().toString(36).substring(2)}`,
      emittedEvents,
    }
  }

  // Generators for property-based testing
  const billArb = fc.record({
    id: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000 }),
    dueDate: fc.string().map(() => '2025-01-01'),
    status: fc.constantFrom('pending', 'overdue', 'paid'),
    createdAt: fc.string().map(() => new Date().toISOString()),
    updatedAt: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<Bill>

  const escalationContextArb = fc.record({
    billId: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
    daysOverdue: fc.integer({ min: 0, max: 10 }),
    level: fc.constantFrom('INFO', 'WARNING', 'CRITICAL'),
    timestamp: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<EscalationContext>

  const escalationEvaluateEventArb = fc.record({
    escalationContext: escalationContextArb,
    bill: billArb,
    timestamp: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<EscalationEvaluateEvent>

  // Property 21: Notification event emission consistency
  test('Property 21: Notification event emission consistency', async () => {
    await fc.assert(
      fc.asyncProperty(escalationEvaluateEventArb, async (escalationEvent) => {
        const mockContext = createMockContext()
        
        // Process the escalation event
        await (handler as any)(
          escalationEvent,
          mockContext
        )

        // Verify exactly one notification.send event was emitted
        expect(mockContext.emit).toHaveBeenCalledTimes(1)
        expect(mockContext.emittedEvents).toHaveLength(1)
        
        const emittedEvent = mockContext.emittedEvents[0]
        expect(emittedEvent.topic).toBe(EVENT_TOPICS.NOTIFICATION_SEND)
        
        // Verify event data structure
        const notificationEvent = emittedEvent.data as NotificationSendEvent
        expect(notificationEvent).toHaveProperty('recipient')
        expect(notificationEvent).toHaveProperty('messageTemplate')
        expect(notificationEvent).toHaveProperty('contextData')
        expect(notificationEvent).toHaveProperty('timestamp')
        expect(notificationEvent).toHaveProperty('traceId')
      }),
      { numRuns: 100 }
    )
  })

  // Property 22: Notification event data completeness
  test('Property 22: Notification event data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(escalationEvaluateEventArb, async (escalationEvent) => {
        const mockContext = createMockContext()
        
        // Process the escalation event
        await (handler as any)(
          escalationEvent,
          mockContext
        )

        const emittedEvent = mockContext.emittedEvents[0]
        const notificationEvent = emittedEvent.data as NotificationSendEvent
        
        // Verify recipient is present and valid
        expect(notificationEvent.recipient).toBeDefined()
        expect(typeof notificationEvent.recipient).toBe('string')
        expect(notificationEvent.recipient.length).toBeGreaterThan(0)
        
        // Verify message template is appropriate for escalation level
        const expectedTemplates = ['bill_due_today', 'bill_overdue_warning', 'bill_overdue_critical', 'bill_overdue_generic']
        expect(expectedTemplates).toContain(notificationEvent.messageTemplate)
        
        // Verify context data contains all required bill information
        expect(notificationEvent.contextData).toHaveProperty('billId', escalationEvent.bill.id)
        expect(notificationEvent.contextData).toHaveProperty('billName', escalationEvent.bill.name)
        expect(notificationEvent.contextData).toHaveProperty('amount', escalationEvent.bill.amount)
        expect(notificationEvent.contextData).toHaveProperty('dueDate', escalationEvent.bill.dueDate)
        expect(notificationEvent.contextData).toHaveProperty('daysOverdue', escalationEvent.escalationContext.daysOverdue)
        expect(notificationEvent.contextData).toHaveProperty('escalationLevel', escalationEvent.escalationContext.level)
        expect(notificationEvent.contextData).toHaveProperty('status', escalationEvent.bill.status)
        
        // Verify timestamp and traceId are present
        expect(notificationEvent.timestamp).toBeDefined()
        expect(notificationEvent.traceId).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  // Property 23: Event traceability
  test('Property 23: Event traceability', async () => {
    await fc.assert(
      fc.asyncProperty(escalationEvaluateEventArb, async (escalationEvent) => {
        const mockContext = createMockContext()
        
        // Process the escalation event
        await (handler as any)(
          escalationEvent,
          mockContext
        )

        const emittedEvent = mockContext.emittedEvents[0]
        const notificationEvent = emittedEvent.data as NotificationSendEvent
        
        // Verify traceId is consistent and links events together
        expect(notificationEvent.traceId).toBe(mockContext.traceId)
        expect(typeof notificationEvent.traceId).toBe('string')
        expect(notificationEvent.traceId.length).toBeGreaterThan(0)
        
        // Verify bill ID is preserved for traceability
        expect(notificationEvent.contextData.billId).toBe(escalationEvent.bill.id)
        
        // Verify escalation context is preserved for audit trail
        expect(notificationEvent.contextData.escalationLevel).toBe(escalationEvent.escalationContext.level)
        expect(notificationEvent.contextData.daysOverdue).toBe(escalationEvent.escalationContext.daysOverdue)
      }),
      { numRuns: 100 }
    )
  })

  // Test message template selection based on escalation level
  test('Message template selection matches escalation level', async () => {
    const testCases = [
      { level: 'INFO', expectedTemplate: 'bill_due_today' },
      { level: 'WARNING', expectedTemplate: 'bill_overdue_warning' },
      { level: 'CRITICAL', expectedTemplate: 'bill_overdue_critical' },
    ]

    for (const testCase of testCases) {
      const mockContext = createMockContext()
      
      const escalationEvent: EscalationEvaluateEvent = {
        escalationContext: {
          billId: 'bill_test',
          daysOverdue: 1,
          level: testCase.level as any,
          timestamp: new Date().toISOString(),
        },
        bill: {
          id: 'bill_test',
          name: 'Test Bill',
          amount: 100,
          dueDate: '2025-01-01',
          status: 'overdue',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      await (handler as any)(
        escalationEvent,
        mockContext
      )

      const emittedEvent = mockContext.emittedEvents[0]
      const notificationEvent = emittedEvent.data as NotificationSendEvent
      
      expect(notificationEvent.messageTemplate).toBe(testCase.expectedTemplate)
    }
  })
})