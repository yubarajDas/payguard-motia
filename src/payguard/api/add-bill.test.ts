import { handler } from './add-bill.step'
import { CreateBillRequest, Bill, STATE_KEYS, EVENT_TOPICS } from '../index.js'

// **Feature: payguard, Property 1: Bill creation generates unique records**

describe('Add Bill API Tests', () => {
  
  // Mock dependencies
  const createMockContext = () => {
    const emittedEvents: any[] = []
    const stateStore = new Map<string, Map<string, any>>()
    
    return {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      traceId: 'test-trace-id',
      emit: jest.fn(async (event) => {
        emittedEvents.push(event)
      }),
      state: {
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
      },
      emittedEvents,
      stateStore,
    }
  }

  test('should create bill with unique ID and emit event', async () => {
    const mockContext = createMockContext()
    const billRequest: CreateBillRequest = {
      name: 'Test Bill',
      amount: 1000,
      dueDate: '2025-12-31',
    }

    const response = await handler(
      { body: billRequest } as any,
      mockContext as any
    )

    expect(response.status).toBe(200)
    
    if (response.status === 200) {
      const createdBill = response.body as Bill

      // Verify unique ID was generated
      expect(createdBill.id).toMatch(/^bill_\d+_[a-z0-9]+$/)

      // Verify bill contains input data
      expect(createdBill.name).toBe(billRequest.name)
      expect(createdBill.amount).toBe(billRequest.amount)
      expect(createdBill.dueDate).toBe(billRequest.dueDate)
      expect(createdBill.status).toBe('pending')

      // Verify state was updated
      expect(mockContext.state.set).toHaveBeenCalledWith(
        STATE_KEYS.BILLS, 
        createdBill.id, 
        createdBill
      )

      // Verify event was emitted
      expect(mockContext.emit).toHaveBeenCalledWith({
        topic: EVENT_TOPICS.BILL_CREATED,
        data: {
          bill: createdBill,
          timestamp: createdBill.createdAt,
        },
      })
    }
  })

  test('should reject bills with past due dates', async () => {
    const mockContext = createMockContext()
    const billRequest: CreateBillRequest = {
      name: 'Test Bill',
      amount: 1000,
      dueDate: '2020-01-01', // Past date
    }

    const response = await handler(
      { body: billRequest } as any,
      mockContext as any
    )

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'INVALID_DUE_DATE',
      message: 'Due date cannot be in the past',
      details: ['Provided due date: 2020-01-01'],
    })

    // Verify no state was updated
    expect(mockContext.state.set).not.toHaveBeenCalled()
    
    // Verify no event was emitted
    expect(mockContext.emit).not.toHaveBeenCalled()
  })

  test('should generate unique IDs for multiple bills', async () => {
    const mockContext = createMockContext()
    const createdIds = new Set<string>()

    // Create 3 bills
    for (let i = 0; i < 3; i++) {
      const billRequest: CreateBillRequest = {
        name: `Test Bill ${i}`,
        amount: 100 + i,
        dueDate: '2025-12-31',
      }

      const response = await handler(
        { body: billRequest } as any,
        mockContext as any
      )

      expect(response.status).toBe(200)
      
      if (response.status === 200) {
        const createdBill = response.body as Bill
        
        // Verify ID is unique
        expect(createdIds.has(createdBill.id)).toBe(false)
        createdIds.add(createdBill.id)
      }
    }

    // Verify all IDs are unique
    expect(createdIds.size).toBe(3)
  })
})