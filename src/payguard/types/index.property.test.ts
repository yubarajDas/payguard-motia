import fc from 'fast-check'
import { 
  billSchema, 
  subscriptionSchema, 
  Bill, 
  Subscription,
  BillStatus,
  EscalationLevel 
} from './index'

// **Feature: payguard, Property 5: Bill data structure consistency**
// **Feature: payguard, Property 9: Subscription data structure consistency**

describe('PayGuard Data Structure Consistency Properties', () => {
  
  // Generators for property-based testing
  const billStatusArb = fc.constantFrom('pending', 'overdue', 'paid') as fc.Arbitrary<BillStatus>
  
  const isoDateArb = fc.integer({ min: 2020, max: 2030 })
    .chain(year => fc.integer({ min: 1, max: 12 })
      .chain(month => fc.integer({ min: 1, max: 28 })
        .map(day => `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)))
  
  const isoTimestampArb = fc.integer({ min: 2020, max: 2030 })
    .chain(year => fc.integer({ min: 1, max: 12 })
      .chain(month => fc.integer({ min: 1, max: 28 })
        .chain(day => fc.integer({ min: 0, max: 23 })
          .chain(hour => fc.integer({ min: 0, max: 59 })
            .chain(minute => fc.integer({ min: 0, max: 59 })
              .map(second => new Date(year, month - 1, day, hour, minute, second).toISOString()))))))
  
  const billArb = fc.record({
    id: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    amount: fc.integer({ min: 1, max: 1000000 }),
    dueDate: isoDateArb,
    status: billStatusArb,
    createdAt: isoTimestampArb,
    updatedAt: isoTimestampArb,
  }) as fc.Arbitrary<Bill>
  
  const subscriptionArb = fc.record({
    id: fc.string({ minLength: 1 }),
    name: fc.string({ minLength: 1 }),
    amount: fc.integer({ min: 1, max: 1000000 }),
    renewalDay: fc.integer({ min: 1, max: 31 }),
    isActive: fc.boolean(),
    createdAt: isoTimestampArb,
    updatedAt: isoTimestampArb,
  }) as fc.Arbitrary<Subscription>

  // Property 5: Bill data structure consistency
  test('Property 5: Bill data structure consistency - all valid bills should contain exactly the required fields', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        // Validate the bill matches the schema
        const parseResult = billSchema.safeParse(bill)
        expect(parseResult.success).toBe(true)
        
        if (parseResult.success) {
          const validatedBill = parseResult.data
          
          // Check that all required fields are present
          expect(validatedBill).toHaveProperty('id')
          expect(validatedBill).toHaveProperty('name')
          expect(validatedBill).toHaveProperty('amount')
          expect(validatedBill).toHaveProperty('dueDate')
          expect(validatedBill).toHaveProperty('status')
          expect(validatedBill).toHaveProperty('createdAt')
          expect(validatedBill).toHaveProperty('updatedAt')
          
          // Check field types
          expect(typeof validatedBill.id).toBe('string')
          expect(typeof validatedBill.name).toBe('string')
          expect(typeof validatedBill.amount).toBe('number')
          expect(typeof validatedBill.dueDate).toBe('string')
          expect(typeof validatedBill.status).toBe('string')
          expect(typeof validatedBill.createdAt).toBe('string')
          expect(typeof validatedBill.updatedAt).toBe('string')
          
          // Check that no extra fields are present
          const expectedFields = ['id', 'name', 'amount', 'dueDate', 'status', 'createdAt', 'updatedAt']
          const actualFields = Object.keys(validatedBill)
          expect(actualFields.sort()).toEqual(expectedFields.sort())
        }
      }),
      { numRuns: 100 }
    )
  })

  // Property 9: Subscription data structure consistency  
  test('Property 9: Subscription data structure consistency - all valid subscriptions should contain exactly the required fields', () => {
    fc.assert(
      fc.property(subscriptionArb, (subscription) => {
        // Validate the subscription matches the schema
        const parseResult = subscriptionSchema.safeParse(subscription)
        expect(parseResult.success).toBe(true)
        
        if (parseResult.success) {
          const validatedSubscription = parseResult.data
          
          // Check that all required fields are present
          expect(validatedSubscription).toHaveProperty('id')
          expect(validatedSubscription).toHaveProperty('name')
          expect(validatedSubscription).toHaveProperty('amount')
          expect(validatedSubscription).toHaveProperty('renewalDay')
          expect(validatedSubscription).toHaveProperty('isActive')
          expect(validatedSubscription).toHaveProperty('createdAt')
          expect(validatedSubscription).toHaveProperty('updatedAt')
          
          // Check field types
          expect(typeof validatedSubscription.id).toBe('string')
          expect(typeof validatedSubscription.name).toBe('string')
          expect(typeof validatedSubscription.amount).toBe('number')
          expect(typeof validatedSubscription.renewalDay).toBe('number')
          expect(typeof validatedSubscription.isActive).toBe('boolean')
          expect(typeof validatedSubscription.createdAt).toBe('string')
          expect(typeof validatedSubscription.updatedAt).toBe('string')
          
          // Check that no extra fields are present
          const expectedFields = ['id', 'name', 'amount', 'renewalDay', 'isActive', 'createdAt', 'updatedAt']
          const actualFields = Object.keys(validatedSubscription)
          expect(actualFields.sort()).toEqual(expectedFields.sort())
        }
      }),
      { numRuns: 100 }
    )
  })

  // Additional validation tests for schema constraints
  test('Bill schema validation - should reject invalid data', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          amount: fc.integer({ max: 0 }), // Invalid: non-positive amount
          dueDate: fc.string(),
          status: billStatusArb,
          createdAt: fc.string(),
          updatedAt: fc.string(),
        }),
        (invalidBill) => {
          const parseResult = billSchema.safeParse(invalidBill)
          expect(parseResult.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Subscription schema validation - should reject invalid renewal days', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          amount: fc.integer({ min: 1 }),
          renewalDay: fc.integer({ max: 0 }), // Invalid: renewal day < 1
          isActive: fc.boolean(),
          createdAt: fc.string(),
          updatedAt: fc.string(),
        }),
        (invalidSubscription) => {
          const parseResult = subscriptionSchema.safeParse(invalidSubscription)
          expect(parseResult.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})