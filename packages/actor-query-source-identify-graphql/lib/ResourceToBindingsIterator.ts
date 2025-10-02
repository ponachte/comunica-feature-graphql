import type { ComunicaDataFactory } from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';
import type { Resource } from './AsyncResourceIterator';
import type { RawRDF } from './SparqlQueryConverter';

export class ResourceToBindingsIterator extends TransformIterator<Resource, RDF.Bindings> {
  private readonly variables: RDF.Variable[];
  private readonly varMap: Record<string, string>;
  private readonly filterMap: Record<string, RawRDF>;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly bindingsFactory: BindingsFactory;

  public constructor(
    source: AsyncIterator<Resource>,
    variables: RDF.Variable[],
    varMap: Record<string, string>,
    filterMap: Record<string, RawRDF>,
    dataFactory: ComunicaDataFactory,
    bindingsFactory: BindingsFactory,
  ) {
    super(source, { autoStart: false });
    this.variables = variables;
    this.varMap = varMap;
    this.filterMap = filterMap;
    this.dataFactory = dataFactory;
    this.bindingsFactory = bindingsFactory;
  }

  protected override _transform(
    resource: Resource,
    done: () => void,
    push: (binding: RDF.Bindings) => void,
  ): void {
    const bindings: Record<string, RDF.Term> = {};

    // --- Filter resources based on filterMap ---
    for (const filterId of Object.keys(this.filterMap)) {
      const filterValue: RawRDF = this.filterMap[filterId];

      if (!resource[filterId]) {
        continue;
      }
      const resourceValue = <RawRDF> resource[filterId];

      if (filterValue['@id']) {
        if (resourceValue['@id'] !== filterValue['@id']) {
          // Doesn't match, skip resource
          done();
          return;
        }
      } else if (filterValue['@type'] && filterValue['@value'] && (
        resourceValue['@value'] !== filterValue['@value'] ||
          resourceValue['@type'] !== filterValue['@type']
      )) {
        // Doesn't match, skip resource
        done();
        return;
      }
    }

    // --- Convert resource values to RDF terms ---
    for (const variable of this.variables) {
      const varName = variable.value;
      const value = resource[this.varMap[varName]];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value['@id']) {
          bindings[varName] = this.dataFactory.namedNode(value['@id']);
        } else if (value['@value'] && value['@type']) {
          bindings[varName] = this.dataFactory.literal(value['@value'], value['@type']);
        } else {
          throw new Error(
            `Invalid RawRDF format for variable "${varName}": ${JSON.stringify(value)}`,
          );
        }
      } else {
        bindings[varName] = literalFromValue(value, this.dataFactory);
      }
    }

    push(this.convertToBindings(bindings));
    done();
  }

  private convertToBindings(raw: Record<string, RDF.Term>): RDF.Bindings {
    return this.bindingsFactory.bindings(
      Object.entries(raw).map(([ key, term ]) => [ this.dataFactory.variable(key), term ]),
    );
  }
}

function literalFromValue(value: any, dataFactory: ComunicaDataFactory): RDF.Literal {
  const XSD = 'http://www.w3.org/2001/XMLSchema#';

  if (typeof value === 'number') {
    // Distinguish integers from decimals
    if (Number.isInteger(value)) {
      return dataFactory.literal(
        value.toString(),
        dataFactory.namedNode(`${XSD}integer`),
      );
    }
    return dataFactory.literal(
      value.toString(),
      dataFactory.namedNode(`${XSD}decimal`),
    );
  }

  if (typeof value === 'boolean') {
    return dataFactory.literal(
      value ? 'true' : 'false',
      dataFactory.namedNode(`${XSD}boolean`),
    );
  }

  if (value instanceof Date) {
    return dataFactory.literal(
      value.toISOString(),
      dataFactory.namedNode(`${XSD}dateTime`),
    );
  }

  // Default: treat as string
  return dataFactory.literal(
    value.toString(),
    dataFactory.namedNode(`${XSD}string`),
  );
}
