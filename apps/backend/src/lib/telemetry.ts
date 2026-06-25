import { NodeSDK } from '@opentelemetry/sdk-node'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

// Create resource with service information
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'verve-backend',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
})

// Use OTLP exporter in production, console exporter in development
const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${process.env.OTEL_EXPORTER_OTLP_HEADERS || ''}`,
      },
    })
  : new ConsoleSpanExporter()

export const otelSdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    new FastifyInstrumentation(),
    new PgInstrumentation()
  ]
})

export function startTelemetry() {
  otelSdk.start()
  
  process.on('SIGTERM', () => {
    otelSdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0))
  })
}
