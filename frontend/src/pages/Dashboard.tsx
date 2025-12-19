import { useState, useEffect } from "react";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { apiClient, type DashboardSummary } from "../api/client";
import EventMonitor from "../components/EventMonitor";

const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = async () => {
    try {
      setError(null);
      const data = await apiClient.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading dashboard
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {(error as Error).message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Total Bills",
      value: summary?.totalBills || 0,
      icon: DollarSign,
      color: "bg-blue-500",
      change: "+12%",
      changeType: "increase",
    },
    {
      name: "Overdue Bills",
      value: summary?.overdueBills || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      change: "-2%",
      changeType: "decrease",
    },
    {
      name: "Critical Alerts",
      value: summary?.criticalBills || 0,
      icon: Clock,
      color: "bg-amber-500",
      change: "0%",
      changeType: "neutral",
    },
    {
      name: "Due Soon",
      value: summary?.dueSoonBills || 0,
      icon: Calendar,
      color: "bg-green-500",
      change: "+5%",
      changeType: "increase",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your bills and subscriptions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              // Generate demo data
              const demoData = [
                { name: "Electric Bill", amount: 12500, dueDate: "2025-12-25" },
                { name: "Internet Bill", amount: 7999, dueDate: "2025-12-28" },
                { name: "Phone Bill", amount: 4500, dueDate: "2025-12-30" },
              ];

              demoData.forEach(async (bill) => {
                try {
                  await apiClient.createBill(bill);
                } catch (error) {
                  console.error("Failed to create demo bill:", error);
                }
              });

              // Refresh data
              setTimeout(() => window.location.reload(), 1000);
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Generate Demo Data
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium">
            🎯 Demo Mode
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === "increase"
                            ? "text-green-600"
                            : stat.changeType === "decrease"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Total Amount
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(summary?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Overdue Amount
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(summary?.overdueAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Bills
          </h3>
          {summary?.recentBills && summary.recentBills.length > 0 ? (
            <div className="space-y-3">
              {summary.recentBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        bill.status === "paid"
                          ? "bg-green-500"
                          : bill.status === "overdue"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {bill.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due: {bill.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(bill.amount)}
                    </p>
                    <p
                      className={`text-xs capitalize ${
                        bill.status === "paid"
                          ? "text-green-600"
                          : bill.status === "overdue"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {bill.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No bills yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first bill.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Event Monitor */}
      <div className="mt-8">
        <EventMonitor />
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Last updated:{" "}
          {summary?.lastUpdated
            ? new Date(summary.lastUpdated).toLocaleString()
            : "Never"}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
