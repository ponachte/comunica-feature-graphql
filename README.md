<p align="center">
  <a href="https://comunica.dev/">
    <img alt="Comunica" src="https://comunica.dev/img/comunica_red.svg" width="200">
  </a>
</p>

<p align="center">
  <strong>Comunica for Querying GraphQL-LD Endpoints with SPARQL Queries</strong>
</p>

<p align="center">
<a href="https://github.com/comunica/comunica-feature-graphql/actions?query=workflow%3ACI"><img src="https://github.com/comunica/comunica-feature-graphql/workflows/CI/badge.svg" alt="Build Status"></a>
<a href="https://coveralls.io/github/comunica/comunica-feature-graphql?branch=master"><img src="https://coveralls.io/repos/github/comunica/comunica-feature-graphql/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://gitter.im/comunica/Lobby"><img src="https://badges.gitter.im/comunica.png" alt="Gitter chat"></a>
</p>

**[Learn more about Comunica on our website](https://comunica.dev/).**

This is a monorepo that contains packages for allowing [Comunica](https://github.com/comunica/comunica) to query over GraphQL-LD endpoints using SPARQL queries. **If you want to _use_ a GraphQL-enabled Comunica engine, have a look at [Comunica SPARQL GraphQL engine](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/query-sparql-graphql).**

Concretely, this monorepo adds GraphQL-LD support to Comunica using the following packages:

* [Comunica SPARQL GraphQL engine](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/query-sparql-graphql): A Comunica query engine that includes all related packages.

* [Comunica Context Preprocess Convert Shortcuts Actor](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/packages/actor-context-preprocess-convert-shortcuts-graphql): A Comunica actor that allows linking a schema and context to a graphql source.

* [Comunica Optimize Query Operation Assign Exhaustive Actor](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/packages/actor-optimize-query-operation-assign-sources-exhaustive): A Comunica actor that allows to extract a BGP from a query and assign all sources to it.

* [Comunica Query Source Identify GraphQl Actor](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/packages/actor-query-source-identify-graphql): A Comunica actor that translates SPARQL algebra into GraphQL queries, retrieves the corresponding resources, and parses them into bindings.

## Development Setup

_(JSDoc: https://comunica.github.io/comunica-feature-hdt/)_

This repository should be used by Comunica module **developers** as it contains multiple Comunica modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for Comunica.

Comunica requires [Node.JS](http://nodejs.org/) 8.0 or higher and the [Yarn](https://yarnpkg.com/en/) package manager.
Comunica is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone https://github.com/comunica/comunica.git
$ cd comunica
$ yarn install
```

**Note: `npm install` is not supported at the moment, as this project makes use of Yarn's [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) functionality**

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.
After that, all [Comunica packages](https://github.com/comunica/comunica-feature-graphql/tree/master/packages) are available in the `packages/` folder
and can be used in a development environment, such as querying with [Comunica SPARQL GraphQL engine (`engines/query-sparql-graphql`)](https://github.com/comunica/comunica-feature-graphql/tree/master/engines/query-sparql-graphql).

Furthermore, this will add [pre-commit hooks](https://www.npmjs.com/package/pre-commit)
to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).