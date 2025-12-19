import { 
  Bill,
  Subscription,
  CreateBillRequest,
  CreateSubscriptionRequest,
  BillCreatedEvent,
  SubscriptionCreatedEvent,
  BillOverdueEvent,
  EscalationEvaluateEvent,
  NotificationSendEvent,
  DailySummaryGeneratedEvent,
  EVENT_TOPICS,
  STATE_KEYS,
  calculateDaysOverdue,
  calculateEscalationLevel
} from '../index'

// Import handlers for integration testing
import { handler as addBillHandler } from '../api/add-bill.step'
import { handler as addSubscriptionHandler } from '../api/add-subscription.step'
import { handler as billCheckerHandler } from '../cron/bill-checker.step'
import { handler as escalationEngineHandler } from '../event/escalation-engine.step'
import { handler as notificationHandler } from '../event/notification-handler.step'
import { handler as dailySummaryHandler } from '../cron/daily-summary.step'
import { handler as billCreatedHandler } from '../event/bill-created-handler.step'
import { handler as subscriptionCreatedHandler } from '../event/subscription-created-handler.step'

describe('PayGuard Integration Tests - Complete Workflows', () => {
  
  // Mock state and event system
  const createIntegrationContext = () => {
    const stateStore = new Map<string, Map<string, any>>()
    const eventQueue: any[] = []
    
    const mockState = {
      set: jest.fn(async (key: string, id: string, value: any) => {
        if (!stateStore.has(key)) {
          stateStore.set(key, new Map())
        }
        stateStore.get(key)!.set(id, value)
      }),
      get: jest.fn(async (key: string, id: string) => {
        return stateStore.get(key)?.get(id)
      }),
      getGroup: jest.fn(async (key: string) => {
        const group = stateStore.get(key)
        return group ? Array.from(group.values()) : []
      }),
    }

    const mockEmit = jest.fn(async (event: any) => {
      eventQueue.push(event)
    })

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }

    return {
      state: mockState,
      emit: mockEmit,
      logger: mockLogger,
      traceId: 'integration-test-trace',
      stateStore,
      eventQueue,
    }
  }

  // Test 1: End-to-end bill creation to notification flow
  test('End-to-end bill creation to notification flow', async () => {
    const context = createIntegrationContext()
    
    // Step 1: Create a bill via API
    const billRequest: CreateBillRequest = {
      name: 'Integration Test Bill',
      amount: 15000, // $150.00
      dueDate: '2024-12-01', // Past due date to trigger overdue flow
    }

    const billResponse = await (addBillHandler as any)(
      { body: billRequest },
      context
    )

    expect(billResponse.status).toBe(200)
    const createdBill = billResponse.body as Bill
    
    // Verify bill.created event was emitted
    expect(context.eventQueue).toHaveLength(1)
    expect(context.eventQueue[0].topic).toBe(EVENT_TOPICS.BILL_CREATED)
    
    const billCreatedEvent = context.eventQueue[0].data as BillCreatedEvent
    
    // Step 2: Process bill.created event
    await (billCreatedHandler as any)(billCreatedEvent, context)
    
    // Step 3: Run bill checker cron to detect overdue bill
    await (billCheckerHandler as any)(context)
    
    // Verify bill.overdue event was emitted
    const overdueEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.BILL_OVERDUE)
    expect(overdueEvents).toHaveLength(1)
    
    const billOverdueEvent = overdueEvents[0].data as BillOverdueEvent
    expect(billOverdueEvent.bill.id).toBe(createdBill.id)
    expect(billOverdueEvent.daysOverdue).toBeGreaterThan(0)
    
    // Step 4: Process escalation
    await (escalationEngineHandler as any)(billOverdueEvent, context)
    
    // Verify escalation.evaluate event was emitted
    const escalationEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.ESCALATION_EVALUATE)
    expect(escalationEvents).toHaveLength(1)
    
    const escalationEvent = escalationEvents[0].data as EscalationEvaluateEvent
    expect(escalationEvent.bill.id).toBe(createdBill.id)
    
    // Step 5: Process notification
    await (notificationHandler as any)(escalationEvent, context)
    
    // Verify notification.send event was emitted
    const notificationEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.NOTIFICATION_SEND)
    expect(notificationEvents).toHaveLength(1)
    
    const notificationEvent = notificationEvents[0].data as NotificationSendEvent
    expect(notificationEvent.contextData.billId).toBe(createdBill.id)
    expect(notificationEvent.recipient).toBeDefined()
    expect(notificationEvent.messageTemplate).toBeDefined()
  })

  // Test 2: Subscription creation and renewal tracking
  test('Subscription creation and renewal tracking', async () => {
    const context = createIntegrationContext()
    
    // Step 1: Create a subscription via API
    const subscriptionRequest: CreateSubscriptionRequest = {
      name: 'Monthly Service',
      amount: 2999, // $29.99
      renewalDay: 15,
    }

    const subscriptionResponse = await (addSubscriptionHandler as any)(
      { body: subscriptionRequest },
      context
    )

    expect(subscriptionResponse.status).toBe(200)
    const createdSubscription = subscriptionResponse.body as Subscription
    
    // Verify subscription.created event was emitted
    expect(context.eventQueue).toHaveLength(1)
    expect(context.eventQueue[0].topic).toBe(EVENT_TOPICS.SUBSCRIPTION_CREATED)
    
    const subscriptionCreatedEvent = context.eventQueue[0].data as SubscriptionCreatedEvent
    
    // Step 2: Process subscription.created event
    await (subscriptionCreatedHandler as any)(subscriptionCreatedEvent, context)
    
    // Verify subscription was stored
    const storedSubscription = await context.state.get(STATE_KEYS.SUBSCRIPTIONS, createdSubscription.id)
    expect(storedSubscription).toEqual(createdSubscription)
    
    // Verify renewal tracking was initialized (check logs)
    expect(context.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Subscription creation processed successfully'),
      expect.objectContaining({
        subscriptionId: createdSubscription.id,
        auditAction: 'SUBSCRIPTION_CREATED_PROCESSED'
      })
    )
  })

  // Test 3: Overdue detection and escalation workflow
  test('Overdue detection and escalation workflow', async () => {
    const context = createIntegrationContext()
    
    // Pre-populate state with bills of different overdue levels
    const bills: Bill[] = [
      {
        id: 'bill_today',
        name: 'Due Today',
        amount: 1000,
        dueDate: new Date().toISOString().split('T')[0], // Today
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bill_warning',
        name: 'Warning Level',
        amount: 2000,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bill_critical',
        name: 'Critical Level',
        amount: 3000,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    // Store bills in state
    for (const bill of bills) {
      await context.state.set(STATE_KEYS.BILLS, bill.id, bill)
    }

    // Step 1: Run bill checker
    await (billCheckerHandler as any)(context)
    
    // Step 2: Process all overdue events through escalation engine
    const overdueEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.BILL_OVERDUE)
    
    for (const overdueEvent of overdueEvents) {
      await (escalationEngineHandler as any)(overdueEvent.data, context)
    }

    // Step 3: Process all escalation events through notification handler
    const escalationEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.ESCALATION_EVALUATE)
    
    for (const escalationEvent of escalationEvents) {
      await (notificationHandler as any)(escalationEvent.data, context)
    }

    // Verify escalation levels are correct
    const escalationEventData = escalationEvents.map(e => e.data as EscalationEvaluateEvent)
    
    // Find events by bill ID and verify escalation levels
    const todayEscalation = escalationEventData.find(e => e.bill.id === 'bill_today')
    const warningEscalation = escalationEventData.find(e => e.bill.id === 'bill_warning')
    const criticalEscalation = escalationEventData.find(e => e.bill.id === 'bill_critical')

    expect(todayEscalation?.escalationContext.level).toBe('INFO')
    expect(warningEscalation?.escalationContext.level).toBe('WARNING')
    expect(criticalEscalation?.escalationContext.level).toBe('CRITICAL')

    // Verify notifications were sent for all overdue bills
    const notificationEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.NOTIFICATION_SEND)
    expect(notificationEvents.length).toBeGreaterThanOrEqual(2) // At least warning and critical
  })

  // Test 4: Daily summary generation with various bill states
  test('Daily summary generation with various bill states', async () => {
    const context = createIntegrationContext()
    
    // Pre-populate state with bills in different states
    const bills: Bill[] = [
      // Pending bills (not overdue)
      {
        id: 'bill_pending_1',
        name: 'Pending Bill 1',
        amount: 1000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Overdue bills (WARNING level)
      {
        id: 'bill_overdue_1',
        name: 'Overdue Bill 1',
        amount: 2000,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
        status: 'overdue',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Critical bills (>3 days overdue)
      {
        id: 'bill_critical_1',
        name: 'Critical Bill 1',
        amount: 3000,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        status: 'overdue',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bill_critical_2',
        name: 'Critical Bill 2',
        amount: 4000,
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        status: 'overdue',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Paid bills
      {
        id: 'bill_paid_1',
        name: 'Paid Bill 1',
        amount: 1500,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    // Store bills in state
    for (const bill of bills) {
      await context.state.set(STATE_KEYS.BILLS, bill.id, bill)
    }

    // Run daily summary generator
    await (dailySummaryHandler as any)(context)
    
    // Verify daily.summary.generated event was emitted
    const summaryEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.DAILY_SUMMARY_GENERATED)
    expect(summaryEvents).toHaveLength(1)
    
    const summaryEvent = summaryEvents[0].data as DailySummaryGeneratedEvent
    const summary = summaryEvent.summary

    // Verify summary calculations
    expect(summary.totalBills).toBe(4) // Excludes paid bills
    expect(summary.overdue).toBe(3) // 1 overdue + 2 critical
    expect(summary.critical).toBe(2) // 2 bills >3 days overdue
    expect(summary.totalAmount).toBe(11500) // Sum of all bills including paid
    expect(summary.overdueAmount).toBe(9000) // Sum of overdue bills (2000 + 3000 + 4000)
  })

  // Test 5: Event chains and state consistency
  test('Event chains and state consistency', async () => {
    const context = createIntegrationContext()
    
    // Create multiple bills and verify state consistency throughout the workflow
    const billRequests: CreateBillRequest[] = [
      { name: 'Bill 1', amount: 1000, dueDate: '2024-11-01' },
      { name: 'Bill 2', amount: 2000, dueDate: '2024-11-15' },
      { name: 'Bill 3', amount: 3000, dueDate: '2024-12-01' },
    ]

    const createdBills: Bill[] = []

    // Create all bills
    for (const request of billRequests) {
      const response = await (addBillHandler as any)({ body: request }, context)
      expect(response.status).toBe(200)
      createdBills.push(response.body as Bill)
    }

    // Verify all bills are stored in state
    const storedBills = await context.state.getGroup(STATE_KEYS.BILLS)
    expect(storedBills).toHaveLength(3)

    // Run bill checker to process overdue bills
    await (billCheckerHandler as any)(context)

    // Verify state consistency after bill checker
    const updatedBills = await context.state.getGroup(STATE_KEYS.BILLS)
    expect(updatedBills).toHaveLength(3)

    // Check that overdue bills have updated status
    const overdueBills = updatedBills.filter((bill: Bill) => bill.status === 'overdue')
    expect(overdueBills.length).toBeGreaterThan(0)

    // Verify event chain integrity
    const billCreatedEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.BILL_CREATED)
    const billOverdueEvents = context.eventQueue.filter(e => e.topic === EVENT_TOPICS.BILL_OVERDUE)
    
    expect(billCreatedEvents).toHaveLength(3)
    expect(billOverdueEvents.length).toBeGreaterThan(0)

    // Verify traceability - each overdue event should correspond to a created bill
    for (const overdueEvent of billOverdueEvents) {
      const overdueData = overdueEvent.data as BillOverdueEvent
      const correspondingBill = createdBills.find(bill => bill.id === overdueData.bill.id)
      expect(correspondingBill).toBeDefined()
    }
  })
})