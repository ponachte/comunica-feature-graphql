# Comunica SPARQL HDT

[![npm version](https://badge.fury.io/js/%40comunica-graphql%2Fquery-sparql-graphql.svg)](https://www.npmjs.com/package/@comunica-graphql/query-sparql-graphql)
[![Docker Pulls](https://img.shields.io/docker/pulls/comunica-graphql/query-sparql-graphql.svg)](https://hub.docker.com/r/comunica-graphql/query-sparql-graphql/)

Comunica SPARQL Solid is a SPARQL query engine for JavaScript that can query over GraphQL-LD endpoints.

This package can only be used within Node.js, and **it does NOT work within browser environments**.

This module is part of the [Comunica framework](https://comunica.dev/).

## Install

```bash
$ yarn add @comunica-graphql/query-sparql-graphql
```

or

```bash
$ npm install -g @comunica-graphql/query-sparql-graphql
```

### Usage within application

This engine can be used in JavaScript/TypeScript applications as follows:

```javascript
const QueryEngine = require('@comunica-graphql/query-sparql-graphql').QueryEngine;
const myEngine = new QueryEngine();

const bindingsStream = await myEngine.queryBindings(`
  SELECT ?s ?p ?o WHERE {
    ?s ?p ?o
  } LIMIT 100`, {
  sources: [ {
    type: 'graphql',
    value: 'http://example.com/graphql',
    context: { /* Optional context for the GraphQL-LD source */
      schema: '...', // GraphQL schema
      context: { ... }, // JSON-LD context for the schema
    },
  } ],
});

// Consume results as a stream (best performance)
bindingsStream.on('data', (binding) => {
  console.log(binding.toString());
});
bindingsStream.on('end', () => {
  // The data-listener will not be called anymore once we get here.
});
bindingsStream.on('error', (error) => {
  console.error(error);
});
```

_[**Read more** about querying an application](https://comunica.dev/docs/query/getting_started/query_app/)._
