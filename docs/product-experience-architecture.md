# Product Experience Architecture

Last updated: August 1, 2026

## Purpose

This document defines the application-shell and dashboard direction for the AI Support Workflow Platform. It records the first Phase 4 implementation increment without replacing the existing feature architecture.

## Design reference boundaries

The uploaded Horizon Next dashboard is used only as a reference for layout rhythm, responsive navigation, card grouping, information hierarchy, and operational dashboard composition.

The implementation does not copy Horizon components, branding, Chakra UI dependencies, chart libraries, or source structure. The product shell is implemented with the repository's existing Next.js, React, Tailwind CSS, and shared components.

## Product shell

The tenant product now uses one shared shell for `/inbox` and `/admin` routes:

- persistent desktop sidebar;
- accessible mobile navigation drawer;
- sticky top bar;
- organization switcher;
- notification, theme, and account controls;
- permission-aware navigation;
- active route states;
- skip-to-content support;
- responsive content widths.

The shell is intentionally separate from the independent Root Admin application.

## Navigation rules

Navigation visibility is derived from the existing role and permission model. A link must not appear when the current role cannot access its destination. Server-side page and API authorization remains authoritative; client-side navigation filtering is only a usability layer.

## Operational dashboard

The workspace overview is backed by existing tenant services. It displays only data that can be calculated from persisted records:

- open and resolved ticket metrics;
- average first-response time;
- active organization members;
- recent support volume;
- AI provider success and failure counts;
- workflow execution health;
- recent workflow activity.

The dashboard intentionally avoids speculative cost savings, fabricated SLA values, fake online-agent counts, or placeholder customer satisfaction scores.

## Tenant isolation correction

AI usage queries now require an organization ID. Normal organizations receive only their own records. The deterministic legacy workspace may also read historical records with no organization ID, matching the controlled migration behavior used by other tenant services.

## Accessibility and motion

The shell includes visible focus states, keyboard-reachable controls, semantic navigation labels, mobile dialog dismissal, minimum touch targets, a skip link, and reduced-motion support. Existing feature screens should continue migrating toward these conventions incrementally.

## Follow-up increments

The next product-experience work should focus on:

1. inbox density, filters, and conversation triage;
2. ticket detail layout and AI action visibility;
3. workflow canvas viewport and keyboard accessibility;
4. knowledge base authoring and retrieval interfaces;
5. loading, empty, and error-state consistency across feature modules;
6. mobile monitoring views for managers.
