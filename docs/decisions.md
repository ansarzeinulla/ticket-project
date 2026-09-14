# Architecture Decisions

## Decision 1: Backend Language

**Decision:** Go

**Reason:** Go provides a simple and efficient environment for building
REST APIs and backend services. It is also suitable for scalable web services.

## Decision 2: Database

**Decision:** PostgreSQL

**Reason:** PostgreSQL provides reliable relational data storage and supports
transactions, constraints and relationships required by an event and
ticketing platform.

## Decision 3: API Style

**Decision:** REST

**Reason:** REST provides a simple and widely supported interface between
the backend and client applications.

## Decision 4: Configuration

**Decision:** Environment variables

**Reason:** Environment variables allow configuration and secrets to remain
outside the source code and make deployment across environments easier.

## Decision 5: Containerization

**Decision:** Docker

**Reason:** Docker provides a consistent development and deployment
environment for the application and its dependencies.
