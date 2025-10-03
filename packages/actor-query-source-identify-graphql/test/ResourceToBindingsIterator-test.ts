import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ResourceToBindingsIterator } from '../lib/ResourceToBindingsIterator';
import type { RawRDF } from '../lib/SparqlQueryConverter';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ResourceToBindingsIterator', () => {
  let variables: RDF.Variable[];
  let varMap: Record<string, string>;
  let filterMap: Record<string, RawRDF>;
  let resources: any[];

  beforeEach(async() => {
    variables = [ DF.variable('name'), DF.variable('homepage') ];
    varMap = {
      name: 'res_name',
      homepage: 'res_homepage',
      age: 'res_age',
    };
    filterMap = {
      res_age: {
        '@value': '16',
        '@type': 'http://www.w3.org/2001/XMLSchema#integer',
      },
    };
    resources = [
      {
        res_name: 'Alice',
        res_homepage: 'http://example.org/alice',
        res_age: {
          '@value': '25',
          '@type': 'http://www.w3.org/2001/XMLSchema#integer',
        },
      },
      {
        res_name: 'Bob',
        res_homepage: 'http://example.org/bob',
        res_age: {
          '@value': '16',
          '@type': 'http://www.w3.org/2001/XMLSchema#integer',
        },
      },
    ];
  });

  it('should transform resources into RDF bindings', async() => {
    const source = new ArrayIterator(resources);
    const iterator = new ResourceToBindingsIterator(source, variables, varMap, filterMap, DF, BF);

    const results = await iterator.toArray();

    expect(results).toHaveLength(1);

    const binding = results[0];

    // TypeScript-safe assertions
    expect(binding).toBeDefined();

    // Use non-null assertion (!) after confirming they're defined
    expect(binding.get(DF.variable('name'))!.value).toBe('Bob');
    expect(binding.get(DF.variable('homepage'))!.termType).toBe('NamedNode');
    expect(binding.get(DF.variable('homepage'))!.value).toBe('http://example.org/bob');
  });

  it('should treat non-URL values as literals', async() => {
    resources = [
      {
        res_name: 'Charlie',
        res_homepage: 'not-a-url',
      },
    ];

    const source = new ArrayIterator(resources);
    const iterator = new ResourceToBindingsIterator(source, variables, varMap, filterMap, DF, BF);

    const results = await iterator.toArray();

    expect(results).toHaveLength(1);

    const binding = results[0];
    expect(binding).toBeDefined();

    // Use non-null assertion (!) after confirming it's defined
    expect(binding.get(DF.variable('homepage'))!.termType).toBe('Literal');
    expect(binding.get(DF.variable('homepage'))!.value).toBe('not-a-url');
  });
});
