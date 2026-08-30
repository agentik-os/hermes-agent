# AGK Labs Model

## Definition

A Lab is a bounded environment for researching, practicing, testing, evaluating and improving intelligence systems without changing production doctrine.

## Scopes

- Learn Lab for guided practice attached to Course or Module
- Organization, Project or OS Lab for experiments, benchmarks and improvement

They use one Lab type with different scope and policy.

## Experiment contract

An Experiment declares hypothesis, subject versions, variants, dataset, metrics, Budget, Runtime, isolation, stopping rule and promotion criteria. Results include raw measurements, analysis, recommendation, residual risk and reproducibility references.

## Improvement boundary

```text
execute -> observe -> evaluate -> propose change -> test -> review -> ratify -> deploy
```

Labs may propose new Prompt, Skill, Agent, OS, routing, memory-provider or adapter versions. They may never ratify or silently promote them. Production changes require evidence, independent gates and authorized approval.

## Hermes mapping

Hermes trajectories, batch runner, eval mechanisms and the separate Hermes self-evolution project are candidate inputs. They run inside the Lab boundary and output candidates. They do not own AGK promotion.

## Priority

Specify now. Implement after Eval, package, provenance and promotion foundations. Advanced autonomous improvement is deferred.
