"""OpenTelemetry setup — tracing + FastAPI instrumentation."""

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


def configure_telemetry(
    service_name: str = "platform-backend",
    otlp_endpoint: str | None = None,
    debug: bool = False,
) -> None:
    """Initialise OpenTelemetry tracing.

    In debug mode, spans are printed to stdout.
    In production, they are exported to an OTLP endpoint (e.g. Jaeger / Tempo).
    """
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    if debug or not otlp_endpoint:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    else:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)


def instrument_app(app: object) -> None:  # app: FastAPI
    """Attach FastAPI auto-instrumentation after telemetry is configured."""
    FastAPIInstrumentor.instrument_app(app)  # type: ignore[arg-type]
