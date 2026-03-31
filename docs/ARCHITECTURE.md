# ARCHITECTURE

## Product Type
- SaaS, multi-tenant.
- Focus: conversion growth for Avito listings.

## High-Level Flow
1. Frontend (Next.js) sends user actions.
2. API validates/authenticates and persists state.
3. Core services manage listings, templates, A/B tests, billing.
4. Queue and workers execute async jobs.
5. External integrations sync with Avito API and messaging providers.

## Core Components
- apps/web: frontend app.
- apps/api: backend API.
- apps/worker: BullMQ processors.
- packages/ui: reusable UI components.
- packages/types: shared types/contracts.
- packages/utils: utility helpers.
- PostgreSQL: main data store.
- Redis: cache and queue backend.
- S3-compatible storage: media assets.

## Backend Modules
- auth
- users
- listings
- templates
- variations
- ab-tests
- metrics
- avito
- billing

## Design Principles
- Core value first: create, test, improve conversion.
- Explicit feature gates by plan.
- Async workloads only through queues.
- Strict typed contracts between apps/packages.
- Production-safe operations with runbook-first approach.
