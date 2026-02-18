// OTLP HTTP/JSON payload types
// See: https://opentelemetry.io/docs/specs/otlp/

export type AnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string | number }
  | { doubleValue: number }
  | { arrayValue: { values: AnyValue[] } }
  | { kvlistValue: { values: KeyValue[] } }
  | { bytesValue: string };

export type KeyValue = {
  key: string;
  value: AnyValue;
};

export type Resource = {
  attributes?: KeyValue[];
  droppedAttributesCount?: number;
};

// --- Logs ---

export type LogRecord = {
  timeUnixNano?: string;
  observedTimeUnixNano?: string;
  severityNumber?: number;
  severityText?: string;
  body?: AnyValue;
  attributes?: KeyValue[];
  droppedAttributesCount?: number;
  traceId?: string;
  spanId?: string;
};

export type ScopeLogs = {
  scope?: {
    name?: string;
    version?: string;
    attributes?: KeyValue[];
  };
  logRecords?: LogRecord[];
};

export type ResourceLogs = {
  resource?: Resource;
  scopeLogs?: ScopeLogs[];
};

export type ExportLogsServiceRequest = {
  resourceLogs?: ResourceLogs[];
};

// --- Metrics ---

export type NumberDataPoint = {
  attributes?: KeyValue[];
  timeUnixNano?: string;
  startTimeUnixNano?: string;
  asInt?: string | number;
  asDouble?: number;
};

export type Sum = {
  dataPoints?: NumberDataPoint[];
  aggregationTemporality?:
    | "AGGREGATION_TEMPORALITY_CUMULATIVE"
    | "AGGREGATION_TEMPORALITY_DELTA"
    | number;
  isMonotonic?: boolean;
};

export type Gauge = {
  dataPoints?: NumberDataPoint[];
};

export type Metric = {
  name?: string;
  description?: string;
  unit?: string;
  sum?: Sum;
  gauge?: Gauge;
};

export type ScopeMetrics = {
  scope?: {
    name?: string;
    version?: string;
    attributes?: KeyValue[];
  };
  metrics?: Metric[];
};

export type ResourceMetrics = {
  resource?: Resource;
  scopeMetrics?: ScopeMetrics[];
};

export type ExportMetricsServiceRequest = {
  resourceMetrics?: ResourceMetrics[];
};
