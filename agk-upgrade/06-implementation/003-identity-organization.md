# 003. Identity and Organization Foundation

**Priority:** P0

**Repository target:** AGK product repository, packages/agk-domain and control plane

**Implementation status:** PLANNED. Product implementation is not authorized.

## Objective

Implement User, IdentityBinding, Organization, Membership and capability-based role bindings behind an identity adapter.

## Why it exists

Tenancy and authorization cannot be layered on Hermes profiles.

## Hermes capabilities reused

- Hermes OAuth and provider auth only for runtime access, not AGK identity

## Files inspected

- AGK-OS AD-001
- AGK-OS AD-302
- Hermes SECURITY.md
- `hermes_cli/profiles.py`

## Files to create

- `packages/agk-domain/src/identity.ts`
- `packages/agk-domain/src/organization.ts`
- `packages/agk-domain/src/membership.ts`

## Files to modify

- None.

## Schemas

- User
- IdentityBinding
- Organization
- Membership
- RoleDefinition

## Interfaces

- IdentityProviderAdapter
- OrganizationService
- MembershipService

## API impact

Organization-scoped identity and membership commands.

## Migration impact

Profiles can be linked as runtime preferences after user authorization; they are not imported as Organizations.

## Tests

- tenant predicate required
- membership revocation immediate
- role cannot grant undeclared capability
- identity provider swap preserves User id

## Acceptance criteria

- One User spans all four surfaces
- Every object resolves one Organization
- Cross-Organization access fails closed

## Risks

- Authentication provider could accidentally own domain identity

## Dependencies

- `002`
