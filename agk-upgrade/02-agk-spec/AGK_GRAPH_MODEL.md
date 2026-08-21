# AGK Graph Model

## Definition

Graph is an engine data structure and visual projection, not a top-level AGK object or independent source of truth.

## Graph forms

- Task Graph: current dependency DAG for a Mission
- object relationship graph: typed edges among canonical objects
- knowledge and lineage projections
- runtime topology projection
- communication and permission overlays

## Canvas contract

A Canvas node references an AGK object id and stores presentation separately. A Canvas edge references a semantic relationship or proposed semantic command. Dragging an edge compiles to operations such as change dependency, reassign owner, add access or remove a binding.

Layout changes and semantic changes have independent revisions and merge rules. Structural writes use object `rev` and reject stale changes with a diff.

## Overlays

Organization, execution, Knowledge, permissions, dependencies, communication and Runtime are filters over canonical edges. They are not merged into one unreadable view.

## Hermes mapping

Hermes Desktop supplies behavior references for panes, layout, routes and gateway interaction but no recursive AGK Organization Canvas. Canonical Canvas lives in AGK Web and its Tauri wrapper while backend objects remain authoritative.
