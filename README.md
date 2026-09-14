# BiletFlow

BiletFlow is a Kazakhstan-focused self-service event and ticketing platform.
It allows individuals, student organizations, businesses, and community groups
to create events and distribute digital tickets.

## Product

BiletFlow provides tools for creating events, managing ticket inventory,
registering attendees, processing paid tickets, issuing digital QR tickets,
and verifying tickets at event entrances.

Creating an event and distributing free tickets is free. Organizers who want
to sell paid tickets must activate paid ticket sales and complete identity
and payout verification.

### Main Features

- Event creation and management
- Free and paid tickets
- Digital QR tickets
- Secure ticket verification
- Attendee management
- Event registration
- Calendar export
- Payment processing
- Mobile ticket verification

## Technology Stack

### Backend

- Go
- REST API

Go is used to build the backend services and API layer.

### Database

- PostgreSQL

PostgreSQL stores users, events, tickets, registrations, payments and other
persistent application data.

### Infrastructure

- Docker
- GitHub Actions
- Git / GitHub

Docker provides consistent application environments, while GitHub Actions can
be used for automated testing and continuous integration.

### Configuration

Application configuration is provided through environment variables.
Sensitive values such as database credentials are not committed to the
repository.

## Initial Architecture

The system follows a client-server architecture.

```text
Client Applications
        |
        v
    REST API
        |
        v
   Go Backend
        |
        v
   PostgreSQL
