import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ResourceToBindingsIterator } from '../lib/ResourceToBindingsIterator';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ResourceToBindingsIterator', () => {
  let variables: RDF.Variable[];
  let varMap: Record<string, string>;
  let resources: any[];

  beforeEach(async() => {
    variables = [ DF.variable('name'), DF.variable('homepage') ];
    varMap = {
      name: 'res_name',
      homepage: 'res_homepage',
    };
    resources = [
      {
        res_name: 'Alice',
        res_homepage: 'http://example.org/alice',
      },
      {
        res_name: 'Bob',
        res_homepage: 'http://example.org/bob',
      },
    ];
  });

  it('should transform resources into RDF bindings', async() => {
    const source = new ArrayIterator(resources);
    const iterator = new ResourceToBindingsIterator(source, variables, varMap, DF, BF);

    const results = await iterator.toArray();

    expect(results).toHaveLength(2);

    const [ binding1, binding2 ] = results;

    // TypeScript-safe assertions
    expect(binding1).toBeDefined();
    expect(binding2).toBeDefined();

    // Use non-null assertion (!) after confirming they're defined
    expect(binding1.get(DF.variable('name'))!.value).toBe('Alice');
    expect(binding1.get(DF.variable('homepage'))!.value).toBe('http://example.org/alice');
    expect(binding1.get(DF.variable('homepage'))!.termType).toBe('NamedNode');

    expect(binding2.get(DF.variable('name'))!.value).toBe('Bob');
    expect(binding2.get(DF.variable('homepage'))!.value).toBe('http://example.org/bob');
    expect(binding2.get(DF.variable('homepage'))!.termType).toBe('NamedNode');
  });

  it('should treat non-URL values as literals', async() => {
    resources = [
      {
        res_name: 'Charlie',
        res_homepage: 'not-a-url',
      },
    ];

    const source = new ArrayIterator(resources);
    const iterator = new ResourceToBindingsIterator(source, variables, varMap, DF, BF);

    const results = await iterator.toArray();

    expect(results).toHaveLength(1);

    const binding = results[0];
    expect(binding).toBeDefined();

    // Use non-null assertion (!) after confirming it's defined
    expect(binding.get(DF.variable('homepage'))!.termType).toBe('Literal');
    expect(binding.get(DF.variable('homepage'))!.value).toBe('not-a-url');
  });
});
