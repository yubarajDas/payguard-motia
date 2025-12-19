const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewalDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillRequest {
  name: string;
  amount: number;
  dueDate: string;
}

export interface CreateSubscriptionRequest {
  name: string;
  amount: number;
  renewalDay: number;
}

export interface DashboardSummary {
  totalBills: number;
  overdueBills: number;
  criticalBills: number;
  dueSoonBills: number;
  totalAmount: number;
  overdueAmount: number;
  recentBills: Bill[];
  lastUpdated: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Bills API
  async getBills(): Promise<{ bills: Bill[]; total: number; timestamp: string }> {
    return this.request('/payguard/bills');
  }

  async createBill(data: CreateBillRequest): Promise<Bill> {
    return this.request('/payguard/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payBill(billId: string): Promise<Bill> {
    return this.request(`/payguard/bills/${billId}/pay`, {
      method: 'PATCH',
    });
  }

  async deleteBill(billId: string): Promise<{ message: string; deletedBill: { id: string; name: string } }> {
    return this.request(`/payguard/bills/${billId}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions API
  async getSubscriptions(): Promise<{ subscriptions: Subscription[]; total: number; timestamp: string }> {
    return this.request('/payguard/subscriptions');
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
    return this.request('/payguard/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard API
  async getSummary(): Promise<DashboardSummary> {
    return this.request('/payguard/summary');
  }
}

export const apiClient = new ApiClient();