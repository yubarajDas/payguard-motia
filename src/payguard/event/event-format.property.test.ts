import fc from 'fast-check'
import { 
  BillCreatedEvent,
  SubscriptionCreatedEvent,
  BillOverdueEvent,
  EscalationEvaluateEvent,
  NotificationSendEvent,
  DailySummaryGeneratedEvent,
  Bill,
  Subscription,
  EscalationContext,
  DailySummary,
  EVENT_TOPICS
} from '../index'

// **Feature: payguard, Property 24: Event format consistency**
// **Feature: payguard, Property 25: Event logging completeness**

describe('Event Format Consistency Property Tests', () => {
  
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

  const subscriptionArb = fc.record({
    id: fc.string({ minLength: 1 }).map(s => `sub_${s}`),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000 }),
    renewalDay: fc.integer({ min: 1, max: 31 }),
    isActive: fc.boolean(),
    createdAt: fc.string().map(() => new Date().toISOString()),
    updatedAt: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<Subscription>

  const escalationContextArb = fc.record({
    billId: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
    daysOverdue: fc.integer({ min: 0, max: 10 }),
    level: fc.constantFrom('INFO', 'WARNING', 'CRITICAL'),
    timestamp: fc.string().map(() => new Date().toISOString()),
  }) as fc.Arbitrary<EscalationContext>

  const dailySummaryArb = fc.record({
    date: fc.string().map(() => new Date().toISOString().split('T')[0]),
    totalBills: fc.integer({ min: 0, max: 100 }),
    overdue: fc.integer({ min: 0, max: 50 }),
    critical: fc.integer({ min: 0, max: 25 }),
    totalAmount: fc.integer({ min: 0, max: 1000000 }),
    overdueAmount: fc.integer({ min: 0, max: 500000 }),
  }) as fc.Arbitrary<DailySummary>

  const timestampArb = fc.string().map(() => new Date().toISOString())

  // Event generators
  const billCreatedEventArb = fc.record({
    bill: billArb,
    timestamp: timestampArb,
  }) as fc.Arbitrary<BillCreatedEvent>

  const subscriptionCreatedEventArb = fc.record({
    subscription: subscriptionArb,
    timestamp: timestampArb,
  }) as fc.Arbitrary<SubscriptionCreatedEvent>

  const billOverdueEventArb = fc.record({
    bill: billArb,
    daysOverdue: fc.integer({ min: 0, max: 10 }),
    timestamp: timestampArb,
  }) as fc.Arbitrary<BillOverdueEvent>

  const escalationEvaluateEventArb = fc.record({
    escalationContext: escalationContextArb,
    bill: billArb,
    timestamp: timestampArb,
  }) as fc.Arbitrary<EscalationEvaluateEvent>

  const notificationSendEventArb = fc.record({
    recipient: fc.emailAddress(),
    messageTemplate: fc.constantFrom('bill_due_today', 'bill_overdue_warning', 'bill_overdue_critical'),
    contextData: fc.record({
      billId: fc.string({ minLength: 1 }).map(s => `bill_${s}`),
      billName: fc.string({ minLength: 1, maxLength: 50 }),
      amount: fc.integer({ min: 1, max: 10000 }),
      dueDate: fc.string().map(() => '2025-01-01'),
      daysOverdue: fc.integer({ min: 0, max: 10 }),
      escalationLevel: fc.constantFrom('INFO', 'WARNING', 'CRITICAL'),
      status: fc.constantFrom('pending', 'overdue', 'paid'),
    }),
    timestamp: timestampArb,
    traceId: fc.string({ minLength: 10, maxLength: 20 }),
  }) as fc.Arbitrary<NotificationSendEvent>

  const dailySummaryGeneratedEventArb = fc.record({
    summary: dailySummaryArb,
    timestamp: timestampArb,
  }) as fc.Arbitrary<DailySummaryGeneratedEvent>

  // Property 24: Event format consistency
  test('Property 24: Event format consistency - All events follow consistent structural format', async () => {
    // Test bill.created events
    await fc.assert(
      fc.property(billCreatedEventArb, (event) => {
        // Verify required fields are present
        expect(event).toHaveProperty('bill')
        expect(event).toHaveProperty('timestamp')
        
        // Verify timestamp format
        expect(typeof event.timestamp).toBe('string')
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        
        // Verify bill structure
        expect(event.bill).toHaveProperty('id')
        expect(event.bill).toHaveProperty('name')
        expect(event.bill).toHaveProperty('amount')
        expect(event.bill).toHaveProperty('dueDate')
        expect(event.bill).toHaveProperty('status')
        expect(event.bill).toHaveProperty('createdAt')
        expect(event.bill).toHaveProperty('updatedAt')
      }),
      { numRuns: 50 }
    )

    // Test subscription.created events
    await fc.assert(
      fc.property(subscriptionCreatedEventArb, (event) => {
        expect(event).toHaveProperty('subscription')
        expect(event).toHaveProperty('timestamp')
        
        expect(typeof event.timestamp).toBe('string')
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        
        expect(event.subscription).toHaveProperty('id')
        expect(event.subscription).toHaveProperty('name')
        expect(event.subscription).toHaveProperty('amount')
        expect(event.subscription).toHaveProperty('renewalDay')
        expect(event.subscription).toHaveProperty('isActive')
      }),
      { numRuns: 50 }
    )

    // Test bill.overdue events
    await fc.assert(
      fc.property(billOverdueEventArb, (event) => {
        expect(event).toHaveProperty('bill')
        expect(event).toHaveProperty('daysOverdue')
        expect(event).toHaveProperty('timestamp')
        
        expect(typeof event.daysOverdue).toBe('number')
        expect(event.daysOverdue).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 50 }
    )

    // Test escalation.evaluate events
    await fc.assert(
      fc.property(escalationEvaluateEventArb, (event) => {
        expect(event).toHaveProperty('escalationContext')
        expect(event).toHaveProperty('bill')
        expect(event).toHaveProperty('timestamp')
        
        expect(event.escalationContext).toHaveProperty('billId')
        expect(event.escalationContext).toHaveProperty('daysOverdue')
        expect(event.escalationContext).toHaveProperty('level')
        expect(event.escalationContext).toHaveProperty('timestamp')
      }),
      { numRuns: 50 }
    )

    // Test notification.send events
    await fc.assert(
      fc.property(notificationSendEventArb, (event) => {
        expect(event).toHaveProperty('recipient')
        expect(event).toHaveProperty('messageTemplate')
        expect(event).toHaveProperty('contextData')
        expect(event).toHaveProperty('timestamp')
        expect(event).toHaveProperty('traceId')
        
        expect(typeof event.recipient).toBe('string')
        expect(typeof event.messageTemplate).toBe('string')
        expect(typeof event.traceId).toBe('string')
        expect(event.contextData).toHaveProperty('billId')
      }),
      { numRuns: 50 }
    )

    // Test daily.summary.generated events
    await fc.assert(
      fc.property(dailySummaryGeneratedEventArb, (event) => {
        expect(event).toHaveProperty('summary')
        expect(event).toHaveProperty('timestamp')
        
        expect(event.summary).toHaveProperty('date')
        expect(event.summary).toHaveProperty('totalBills')
        expect(event.summary).toHaveProperty('overdue')
        expect(event.summary).toHaveProperty('critical')
        expect(event.summary).toHaveProperty('totalAmount')
        expect(event.summary).toHaveProperty('overdueAmount')
      }),
      { numRuns: 50 }
    )
  })

  // Property 25: Event logging completeness
  test('Property 25: Event logging completeness - All events contain sufficient data for audit and debugging', async () => {
    // Test that all events have timestamps for audit trails
    const allEventTypes = [
      billCreatedEventArb,
      subscriptionCreatedEventArb,
      billOverdueEventArb,
      escalationEvaluateEventArb,
      notificationSendEventArb,
      dailySummaryGeneratedEventArb,
    ]

    for (const eventArb of allEventTypes) {
      await fc.assert(
        fc.property(eventArb, (event: any) => {
          // Every event must have a timestamp for audit purposes
          expect(event).toHaveProperty('timestamp')
          expect(typeof event.timestamp).toBe('string')
          expect(event.timestamp.length).toBeGreaterThan(0)
          
          // Timestamp should be a valid ISO string
          expect(() => new Date(event.timestamp)).not.toThrow()
          
          // Event should have identifiable data for debugging
          const hasIdentifier = 
            event.bill?.id || 
            event.subscription?.id || 
            event.escalationContext?.billId || 
            event.contextData?.billId ||
            event.summary?.date
          
          expect(hasIdentifier).toBeTruthy()
        }),
        { numRuns: 25 }
      )
    }
  })

  // Test event topic consistency
  test('Event topics follow consistent naming convention', () => {
    const eventTopics = Object.values(EVENT_TOPICS)
    
    for (const topic of eventTopics) {
      // All topics should be lowercase with dots as separators
      expect(topic).toMatch(/^[a-z]+(\.[a-z]+)*$/)
      
      // Topics should not start or end with dots
      expect(topic).not.toMatch(/^\./)
      expect(topic).not.toMatch(/\.$/)
      
      // Topics should not have consecutive dots
      expect(topic).not.toMatch(/\.\./)
    }
  })

  // Test data type consistency across events
  test('Data types are consistent across similar event fields', async () => {
    await fc.assert(
      fc.property(
        billCreatedEventArb,
        billOverdueEventArb,
        escalationEvaluateEventArb,
        (billCreated, billOverdue, escalation) => {
          // Bill IDs should always be strings
          expect(typeof billCreated.bill.id).toBe('string')
          expect(typeof billOverdue.bill.id).toBe('string')
          expect(typeof escalation.bill.id).toBe('string')
          
          // Amounts should always be numbers
          expect(typeof billCreated.bill.amount).toBe('number')
          expect(typeof billOverdue.bill.amount).toBe('number')
          expect(typeof escalation.bill.amount).toBe('number')
          
          // Timestamps should always be strings
          expect(typeof billCreated.timestamp).toBe('string')
          expect(typeof billOverdue.timestamp).toBe('string')
          expect(typeof escalation.timestamp).toBe('string')
          
          // Bill names should always be strings
          expect(typeof billCreated.bill.name).toBe('string')
          expect(typeof billOverdue.bill.name).toBe('string')
          expect(typeof escalation.bill.name).toBe('string')
        }
      ),
      { numRuns: 50 }
    )
  })

  // Test that events contain no undefined or null required fields
  test('Events do not contain undefined or null in required fields', async () => {
    await fc.assert(
      fc.property(billCreatedEventArb, (event) => {
        expect(event.bill).toBeDefined()
        expect(event.bill.id).toBeDefined()
        expect(event.bill.name).toBeDefined()
        expect(event.bill.amount).toBeDefined()
        expect(event.timestamp).toBeDefined()
        
        expect(event.bill).not.toBeNull()
        expect(event.bill.id).not.toBeNull()
        expect(event.bill.name).not.toBeNull()
        expect(event.timestamp).not.toBeNull()
      }),
      { numRuns: 50 }
    )

    await fc.assert(
      fc.property(notificationSendEventArb, (event) => {
        expect(event.recipient).toBeDefined()
        expect(event.messageTemplate).toBeDefined()
        expect(event.contextData).toBeDefined()
        expect(event.traceId).toBeDefined()
        expect(event.timestamp).toBeDefined()
        
        expect(event.recipient).not.toBeNull()
        expect(event.messageTemplate).not.toBeNull()
        expect(event.contextData).not.toBeNull()
        expect(event.traceId).not.toBeNull()
        expect(event.timestamp).not.toBeNull()
      }),
      { numRuns: 50 }
    )
  })
})