# Comunica Convert Shortcuts Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica-graphql%2Factor-context-preprocess-convert-shortcuts-graphql.svg)](https://www.npmjs.com/package/@comunica-graphql/actor-context-preprocess-convert-shortcuts-graphql)

An [Context Preprocess](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess) actor
that expands shortcuts in the context to full context keys.
Available shortcuts can be configured in this actor via the `contextKeyShortcuts` parameter.

This module is part of the [Comunica SPARQL GraphQL engine](https://github.com/ponachte/comunica-feature-graphql),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica-graphql/actor-context-preprocess-convert-shortcuts-graphql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica-gaphql/actor-context-preprocess-convert-shortcuts-graphql/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#convert-shortcuts-graphql",
      "@type": "ActorContextPreprocessConvertShortcuts"
    }
  ]
}
```

### Config Parameters

* `contextKeyShortcuts`: Shortcuts to expand.
