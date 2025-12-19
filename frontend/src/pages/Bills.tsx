import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
} from "lucide-react";
import { apiClient, type Bill } from "../api/client";

const Bills = () => {
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "paid">(
    "all"
  );
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBills = async () => {
    try {
      setError(null);
      const data = await apiClient.getBills();
      setBills(data.bills);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      await apiClient.payBill(billId);
      fetchBills(); // Refresh the list
    } catch (err) {
      console.error("Failed to pay bill:", err);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredBills = bills.filter((bill) => {
    if (filter === "all") return true;
    return bill.status === filter;
  });

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return CheckCircle;
      case "overdue":
        return AlertTriangle;
      case "pending":
        return Clock;
      default:
        return Clock;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return "Due today";
    } else {
      return `${diffDays} days left`;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
              Error loading bills
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {(error as Error).message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your bills and payment obligations
          </p>
        </div>
        <Link
          to="/add-bill"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Bill
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { key: "all", label: "All Bills", count: bills.length },
            {
              key: "pending",
              label: "Pending",
              count: bills.filter((b) => b.status === "pending").length,
            },
            {
              key: "overdue",
              label: "Overdue",
              count: bills.filter((b) => b.status === "overdue").length,
            },
            {
              key: "paid",
              label: "Paid",
              count: bills.filter((b) => b.status === "paid").length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  filter === tab.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bills List */}
      {filteredBills.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredBills.map((bill) => {
              const StatusIcon = getStatusIcon(bill.status);
              return (
                <li key={bill.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <StatusIcon
                            className={`h-5 w-5 ${
                              bill.status === "paid"
                                ? "text-green-500"
                                : bill.status === "overdue"
                                ? "text-red-500"
                                : "text-yellow-500"
                            }`}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {bill.name}
                            </p>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                bill.status
                              )}`}
                            >
                              {bill.status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <p>
                              Due {formatDate(bill.dueDate)} •{" "}
                              {getDaysUntilDue(bill.dueDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(bill.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created {formatDate(bill.createdAt)}
                          </p>
                        </div>
                        {bill.status !== "paid" && (
                          <button
                            onClick={() => handlePayBill(bill.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {filter === "all" ? "No bills yet" : `No ${filter} bills`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "all"
              ? "Get started by adding your first bill."
              : `You don't have any ${filter} bills at the moment.`}
          </p>
          {filter === "all" && (
            <div className="mt-6">
              <Link
                to="/add-bill"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first bill
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Bills;
