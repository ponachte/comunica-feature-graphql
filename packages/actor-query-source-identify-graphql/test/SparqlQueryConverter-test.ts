import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { SparqlQueryConverter } from '../lib/SparqlQueryConverter';

const DF = new DataFactory();
const AF = new Factory(DF);

describe('SparqlQueryConverter', () => {
  const schemaSource = `
    type ex_Book {
      id: ID!
      ex_title: String
      ex_author: ex_Author
    }

    type ex_Author {
      id: ID!
      ex_name: String
    }

    type Query {
      book(id: ID!): ex_Book
      books: [ex_Book]
    }
  `;

  const context = {
    ex: 'http://example.org/',
  };

  let converter: SparqlQueryConverter;

  beforeEach(() => {
    converter = new SparqlQueryConverter(DF, context, schemaSource);
  });

  it('should initialize with parsed schema and entry fields', () => {
    expect(converter.entryFields).toHaveLength(2);
    expect(converter.entryFields.map(f => f.name())).toContain('book');
    expect(converter.entryFields.map(f => f.name())).toContain('books');
  });

  describe('toSchemaNs', () => {
    it('should convert a NamedNode to schema namespace format', () => {
      const term = DF.namedNode('http://example.org/title');
      const converted = converter.toSchemaNs(term);
      expect(converted.value).toBe('ex_title');
    });

    it('should throw on unknown namespace', () => {
      const term = DF.namedNode('http://unknown.org/title');
      expect(() => converter.toSchemaNs(term)).toThrow('Term cannot be converted to schema namespace');
    });

    it('should return non-NamedNode terms unchanged', () => {
      const term = DF.variable('v');
      expect(converter.toSchemaNs(term)).toBe(term);
    });
  });

  describe('convertOperation', () => {
    it('should convert a simple SPARQL pattern to GraphQL query', () => {
      const patterns: Algebra.Pattern[] = [
        AF.createPattern(
          DF.variable('b'),
          DF.namedNode('http://example.org/title'),
          DF.variable('title'),
        ),
        AF.createPattern(
          DF.variable('b'),
          DF.namedNode('http://example.org/author'),
          DF.variable('a'),
        ),
        AF.createPattern(
          DF.variable('a'),
          DF.namedNode('http://example.org/name'),
          DF.variable('name'),
        ),
      ];

      const [ query, varMap ] = converter.convertOperation(patterns)[0];

      expect(query).toBe('books { id ex_title ex_author { id ex_name } }');

      expect(varMap).toMatchObject({
        title: 'books_ex_title',
        name: 'books_ex_author_ex_name',
        a: 'books_ex_author_id',
        b: 'books_id',
      });
    });

    it('should throw on multiple roots', () => {
      const patterns: Algebra.Pattern[] = [
        AF.createPattern(
          DF.variable('b1'),
          DF.namedNode('http://example.org/title'),
          DF.variable('title1'),
        ),
        AF.createPattern(
          DF.variable('b2'),
          DF.namedNode('http://example.org/title'),
          DF.variable('title2'),
        ),
      ];

      expect(() => converter.convertOperation(patterns)).toThrow('Multiple entrypoints found');
    });

    it('should throw on variable predicate', () => {
      const patterns: Algebra.Pattern[] = [
        AF.createPattern(
          DF.variable('b'),
          DF.variable('p'),
          DF.variable('o'),
        ),
      ];

      expect(() => converter.convertOperation(patterns)).toThrow('Cannot convert queries with a variable predicate');
    });
  });
});
