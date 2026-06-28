import { NodeSDK } from '@opentelemetry/sdk-node'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'

const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    })
  : undefined

export const otelSdk = new NodeSDK({
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
