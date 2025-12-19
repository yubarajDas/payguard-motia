import { useState, useEffect } from "react";
import { Activity, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface Event {
  id: string;
  type: string;
  timestamp: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
}

const EventMonitor = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate real-time events for demo
    const interval = setInterval(() => {
      const eventTypes = [
        {
          type: "bill.created",
          message: "New bill added to system",
          severity: "info" as const,
        },
        {
          type: "bill.overdue",
          message: "Bill became overdue",
          severity: "warning" as const,
        },
        {
          type: "escalation.evaluate",
          message: "Escalation level calculated",
          severity: "error" as const,
        },
        {
          type: "notification.sent",
          message: "Notification sent to user",
          severity: "success" as const,
        },
      ];

      const randomEvent =
        eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const newEvent: Event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: randomEvent.type,
        timestamp: new Date().toISOString(),
        message: randomEvent.message,
        severity: randomEvent.severity,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
    }, 5000); // New event every 5 seconds

    setIsConnected(true);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":
        return "bg-blue-50 border-blue-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "success":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Live Event Stream
          </h3>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-500">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-md border ${getSeverityColor(
                  event.severity
                )}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {event.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <Activity className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Waiting for events...
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Events are simulated for demo purposes
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventMonitor;
