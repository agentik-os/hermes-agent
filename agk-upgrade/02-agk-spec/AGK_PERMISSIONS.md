# AGK Permissions

## Allow decision

Capability and authorization are separate:

```text
AUTHORIZATION = Permission intersect Risk intersect Policy intersect Environment intersect Approval
ALLOWED ACTION = Capability intersect AUTHORIZATION
```

Collapsing any two terms is a security defect.

## Scope

Permissions apply to Actor, action verb, object, Organization, optional Project, environment, conditions and time. Role is a convenient source of grants and never the complete authorization model.

## Verbs

Objects inherit read, create, edit, archive and reference where applicable, then declare domain verbs such as run, deploy, approve, publish, install, share, administer, manage policy or access secret reference.

## Approval

An Approval is durable asynchronous state. An `ApprovalGrant` is conditional and re-evaluated against current policy on every use. Expiry never implies approval. Escalation increases visibility and never authority.

## Autonomy

An `AutonomyLease` grants standing authority for a bounded capability, scope and time. Higher-risk leases are shorter. An Agent cannot issue or extend its own lease.

## Hermes mapping

Hermes command approvals, toolsets, gateway allowlists and plugin capability consent are defense-in-depth inputs. They are not AGK Permission objects and are not the sole enforcement boundary. A sandbox-external effect broker re-evaluates exact arguments and any canonical Approval or ApprovalGrant immediately before an effect.

## Freshness

Consequential decisions validate canonical permission state. A stale or invalid projection is not used for authorization.
