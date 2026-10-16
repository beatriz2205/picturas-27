<!--
Sync Impact Report
- Version change: 0.0.0 -> 1.0.0
- Modified principles: initial constitution; five principles added
- Added sections: Security and Operations; Development Workflow
- Removed sections: none
- Deferred items: TODO(RATIFICATION_DATE): original adoption date is not recorded in repository metadata
-->

# PictuRAS Constitution

## Core Principles

### I. Architecture Integrity
PictuRAS MUST treat the platform as a secure, observable microservice system. Each service MUST have a single responsibility, explicit interfaces, and documented data contracts. The frontend, API gateway, worker services, message broker, object storage, and databases MUST remain separated by clear trust boundaries; no service may bypass the gateway or directly expose internal-only ports. This keeps the architecture understandable for students and operators and reduces failure modes across the image-processing pipeline.

### II. Security and Privacy by Default
All user, project, and billing data MUST be protected with authentication, authorization, and encryption controls appropriate to their sensitivity. JWT-based access control MUST be enforced at the API layer, secrets MUST remain in environment configuration, and sensitive fields MUST be encrypted at rest. The team MUST avoid committing credentials, private keys, or local-only infrastructure details. This protects user trust and matches the repository's requirement for secure image processing and encrypted storage.

### III. Evidence-Driven Delivery
Every functional change MUST be traceable to a requirement, issue, or release note. New behavior MUST be validated with focused tests, reproducible checks, or service smoke tests before merge. The project MUST prefer automation for linting, health checks, and integration validation over informal manual verification. This reduces regressions in a multi-service system where one change can affect the gateway, worker queues, and storage layers.

### IV. Quality and Observability in Production
The system MUST provide clear status reporting for image-processing jobs, worker health, and failure modes. Background jobs MUST expose progress updates through the WebSocket gateway or structured logs, and operators MUST be able to determine which service failed and why without inspecting unrelated components. No feature may be merged without a credible path to diagnose failures and verify outputs. This preserves the project's reliance on asynchronous AI and image-processing tools.

### V. Simple, Sustainable Evolution
The team MUST prefer explicit, readable implementations over clever abstractions. When changing architecture or APIs, the project MUST document trade-offs, preserve backward compatibility where possible, and keep deployment and local development flows understandable. New features MUST be added in small increments with clear ownership and testability. This keeps the repository maintainable as a teaching project with evolving contributions and technical debt.

## Security and Operations

PictuRAS MUST operate behind HTTPS through the public reverse proxy, with internal services remaining isolated from direct host exposure unless a documented exception exists. RabbitMQ, MongoDB, and SeaweedFS MUST be treated as shared infrastructure with clear access policies and environment-specific configuration stored outside source control. AI and image-processing services MUST run in isolated worker containers and MUST not bypass the queue-driven workflow. Security reviews, credential hygiene, and environment validation are mandatory before deployment and for any change that affects data handling or service boundaries.

## Development Workflow

All changes MUST be made through small, reviewable branches and commits with a clear owner and a direct relationship to project requirements. Before merge, the relevant service or frontend checks MUST be run, including any targeted tests, smoke validation, or docker-compose verification required by the changed area. Pull requests MUST require review from at least one maintainer and evidence that the change complies with this constitution. Any architecture, data-model, security, or deployment change MUST be documented before rollout, and any temporary exception MUST include an owner, expiry, and remediation plan.

## Governance

This constitution supersedes informal habits, local preference, and undocumented process for the PictuRAS project. Amendments require a written proposal, explicit rationale, and approval by the current maintainers or academic owners before the change becomes effective. The project MUST treat governance as a living artifact: all changes to principles, quality gates, or operational requirements MUST be reflected in the constitution and in the relevant project documentation.

Versioning MUST follow semantic versioning. A MAJOR version change is required for backward-incompatible governance or principle changes, a MINOR version change for new or materially expanded principles or required sections, and a PATCH version change for clarifications, wording fixes, or non-semantic refinements. Compliance review is mandatory at the start of each milestone and before release candidates; each reviewer MUST confirm that code, architecture, tests, and documentation remain aligned with the constitution.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is not recorded in repository metadata | **Last Amended**: 2026-10-14
