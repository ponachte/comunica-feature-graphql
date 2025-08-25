# Comunica Graphql Query Source Identify Actor

[![npm version](https://badge.fury.io/js/%40comunica-graphql%2Factor-query-source-identify-graphql.svg)](https://www.npmjs.com/package/@comunica-graphql/actor-query-source-identify-graphql)

A comunica Graphql Query Source Identify Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica-graphql/actor-query-source-identify-graphql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica-graphql/actor-query-source-identify-graphql/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify/actors#graphql",
      "@type": "ActorQuerySourceIdentifyGraphql",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
