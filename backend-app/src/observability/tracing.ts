import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;
let started = false;

export function initTracing(): void {
  if (started) return;
  const enabled = (process.env.OTEL_ENABLED ?? 'false').toLowerCase() === 'true';
  if (!enabled) return;

  // Optional verbose diagnostics when troubleshooting
  if ((process.env.OTEL_DIAG_LOG ?? 'false').toLowerCase() === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces';

  const traceExporter = new OTLPTraceExporter({ url: endpoint });
  sdk = new NodeSDK({
    // Resource with service name can be provided via environment variable
    // OTEL_SERVICE_NAME; we also set deployment env via env if needed.
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-mysql2': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
      }),
    ],
  });

  try {
    // Some versions return void; treat as sync start
    // If Promise is returned, it's fine to not await here
    // because tracing initializes quickly in background
    // and we don't want to block server startup.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (sdk.start as unknown as () => void)();
    started = true;
  } catch (err) {
    // Non-fatal: continue app startup without tracing
    // eslint-disable-next-line no-console
    console.warn('[otel] failed to start tracing', err);
  }

  const shutdown = async (): Promise<void> => {
    if (!sdk) return;
    try {
      await sdk.shutdown();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[otel] shutdown error', e);
    }
  };
  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
}

