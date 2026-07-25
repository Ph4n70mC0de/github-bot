import { Registry, Counter, Gauge } from "prom-client";

export const registry = new Registry();

export const webhookEventsTotal = new Counter({
  name: "github_webhook_events_total",
  help: "Total webhook events received by event name",
  labelNames: ["event", "status"] as const,
  registers: [registry],
});

export const handlerErrorsTotal = new Counter({
  name: "github_handler_errors_total",
  help: "Total handler errors by event name",
  labelNames: ["event"] as const,
  registers: [registry],
});

export const queueDepth = new Gauge({
  name: "github_queue_depth",
  help: "Current BullMQ queue depth",
  registers: [registry],
});

export function recordWebhookEvent(event: string, status: "success" | "error") {
  webhookEventsTotal.inc({ event, status });
}

export function recordHandlerError(event: string) {
  handlerErrorsTotal.inc({ event });
}
