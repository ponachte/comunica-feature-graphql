# Comunica Assign Sources Exhaustive Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-assign-sources-exhaustive-graphql.svg)](https://www.npmjs.com/package/@comunica-graphql/actor-optimize-query-operation-assign-sources-exhaustive-graphql)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that converts every quad pattern in the query to a union of quad patterns per source.
It will similarly handle property paths.

If only a single source is being queried over, it will attempt to assign the whole query operation to the source
if the source supports such operations. Otherwise, it will fallback to the union-based approach.

This module is part of the [Comunica SPARQL GraphQl engine](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica-graphql/actor-optimize-query-operation-assign-sources-exhaustive-graphql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica-graphql/actor-optimize-query-operation-assign-sources-exhaustive-graphql/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#assign-sources-exhaustive-graphql",
      "@type": "ActorOptimizeQueryOperationAssignSourcesExhaustive"
    }
  ]
}
```
