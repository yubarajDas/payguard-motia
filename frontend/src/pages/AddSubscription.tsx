import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Calendar, RefreshCw } from "lucide-react";
import { apiClient, type CreateSubscriptionRequest } from "../api/client";

const AddSubscription = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateSubscriptionRequest>({
    name: "",
    amount: 0,
    renewalDay: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Subscription name is required";
    }

    if (formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (formData.renewalDay < 1 || formData.renewalDay > 31) {
      newErrors.renewalDay = "Renewal day must be between 1 and 31";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // Convert amount from dollars to cents
        const subscriptionData = {
          ...formData,
          amount: Math.round(formData.amount * 100),
        };

        await apiClient.createSubscription(subscriptionData);
        navigate("/subscriptions");
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to create subscription"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, amount: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/subscriptions"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subscriptions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Add New Subscription
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new recurring subscription to track monthly payments
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Subscription Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Subscription Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <RefreshCw className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="e.g., Netflix, Spotify, Adobe Creative Cloud"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              Monthly Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={formData.amount || ""}
                onChange={handleAmountChange}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.amount ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Enter the monthly amount in dollars (e.g., 9.99)
            </p>
          </div>

          {/* Renewal Day */}
          <div>
            <label
              htmlFor="renewalDay"
              className="block text-sm font-medium text-gray-700"
            >
              Renewal Day of Month
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="renewalDay"
                value={formData.renewalDay}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    renewalDay: parseInt(e.target.value),
                  }))
                }
                className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.renewalDay ? "border-red-300" : "border-gray-300"
                }`}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1
                      ? "st"
                      : day === 2
                      ? "nd"
                      : day === 3
                      ? "rd"
                      : "th"}{" "}
                    of each month
                  </option>
                ))}
              </select>
            </div>
            {errors.renewalDay && (
              <p className="mt-1 text-sm text-red-600">{errors.renewalDay}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Choose the day of the month when this subscription renews
            </p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link
              to="/subscriptions"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Subscription"}
            </button>
          </div>
        </form>
      </div>

      {/* Preview */}
      {formData.name && formData.amount > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">Preview</h3>
          <div className="text-sm text-green-700">
            <p>
              <strong>{formData.name}</strong>
            </p>
            <p>Amount: ${formData.amount.toFixed(2)}/month</p>
            <p>
              Renews: {formData.renewalDay}
              {formData.renewalDay === 1
                ? "st"
                : formData.renewalDay === 2
                ? "nd"
                : formData.renewalDay === 3
                ? "rd"
                : "th"}{" "}
              of each month
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSubscription;
