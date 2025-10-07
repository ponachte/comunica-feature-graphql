import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionContext, MetadataBindings } from '@comunica/types';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { BufferedIterator } from 'asynciterator';
import type { RawRDF } from './SparqlQueryConverter';

export type Resource = Record<string, string | RawRDF>;

export function flattenResponse(obj: any, prefix = ''): Resource[] {
  if (Array.isArray(obj)) {
    // Flatten each item in the array and combine results
    return obj.flatMap(item => flattenResponse(item, prefix));
  }

  if (typeof obj !== 'object' || obj === null) {
    // Primitive value — wrap in an object
    return [{ [prefix]: obj }];
  }

  const entries: Resource[] = [{}];

  for (const [ key, value ] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;

    let flattened: Resource[];
    if (key === '_rawRDF' && typeof value === 'object' && value !== null) {
      // Special case: keep _rawRDF intact
      flattened = [{ [fullKey]: <RawRDF> value }];
    } else {
      // Recurse normally
      flattened = flattenResponse(value, fullKey);
    }

    // Combine each flattened result with the existing entries
    const combined: Resource[] = [];

    for (const entry of entries) {
      for (const flat of flattened) {
        combined.push({ ...entry, ...flat });
      }
    }

    // Replace entries
    entries.splice(0, entries.length, ...combined);
  }

  return entries;
}

export class AsyncResourceIterator extends BufferedIterator<Resource> {
  private readonly source: string;
  public query: string;
  private readonly context: IActionContext;
  private readonly mediatorHttp: MediatorHttp;
  private countMetadata: Promise<MetadataBindings> | undefined;

  public constructor(
    source: string,
    query: string,
    context: IActionContext,
    mediatorHttp: MediatorHttp,
  ) {
    super({ maxBufferSize: Number.POSITIVE_INFINITY, autoStart: false });
    this.source = source;
    this.query = query;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  protected override async _read(_count: number, done: () => void): Promise<void> {
    try {
      while (_count > 0) {
        // Fetch graphql query results
        const response = await this._query(this.query);

        // Extract resources from results
        const resources: Resource[] = flattenResponse(response.data);
        for (const resource of resources) {
          this._push(resource);
        }
        _count -= resources.length;

        // Check if there are more resources available
        const paginations = response?.extensions?.pagination?.filter((p: any) => p?.next);

        if (!paginations || paginations.length === 0) {
          this.close();
          break;
        }

        // Find the pagination with the deepest path
        const deepestPagination = paginations.reduce((deepest: any, current: any) => {
          const currentDepth = current.path.split('/').filter(Boolean).length;
          const deepestDepth = deepest.path.split('/').filter(Boolean).length;
          return currentDepth > deepestDepth ? current : deepest;
        });

        // Update query with cursor
        this.query = this._updateCursorInQuery(this.query, deepestPagination.path, deepestPagination.next);
      }
    } catch (err) {
      this.emit('error', err);
      this.close();
    } finally {
      done();
    }
  }

  private async _query(query: string): Promise<any> {
    const body = {
      '@context': {},
      query: `query { ${query} }`,
    };

    const init: RequestInit = {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      method: 'POST',
      body: JSON.stringify(body),
    };

    const response = await this.mediatorHttp.mediate({
      input: this.source,
      init,
      context: this.context,
    });

    if (!response.ok) {
      // Try to read the body for extra error info
      let errorBody: any;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = '<failed to read body>';
      }

      throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorBody}`);
    }

    return await response.json();
  }

  private _updateCursorInQuery(query: string, path?: string, newCursor = ''): string {
    const pathParts = path ? path.replace(/^\/+/u, '').split('/') : [];

    function insertCursorAtField(source: string, parts: string[], depth = 0): string {
      const field = parts[0];
      let index = 0;
      let inString = false;

      while (index < source.length) {
        const char = source[index];

        // Handle string quotes properly (avoid modifying inside strings)
        if (char === '"') {
          inString = !inString;
          index++;
          continue;
        }

        // Root-level query injection
        if (parts.length === 0 && depth === 0) {
          // Find the first field in the query body
          const fieldMatch = /\b([_A-Za-z][_0-9A-Za-z]*)\b\s*(\(|\{)/u.exec(source);
          if (!fieldMatch) {
            throw new Error('Unable to locate root field in query.');
          }

          const fieldName = fieldMatch[1];
          const matchStart = fieldMatch.index;
          const matchEnd = matchStart + fieldName.length;
          let i = matchEnd;

          // Skip whitespace
          while (/\s/u.test(source[i])) {
            i++;
          }

          // Check for existing arguments
          if (source[i] === '(') {
            let parenCount = 1;
            const argsStart = i;
            i++;

            while (i < source.length && parenCount > 0) {
              if (source[i] === '(') {
                parenCount++;
              } else if (source[i] === ')') {
                parenCount--;
              }
              i++;
            }

            const argsEnd = i;
            const argsStr = source
              .slice(argsStart + 1, argsEnd - 1)
              .split(',')
              .map(arg => arg.trim())
              .filter(arg => arg && !arg.startsWith('cursor:'));

            argsStr.push(`cursor: "${newCursor}"`);
            const updatedField = `${fieldName}(${argsStr.join(', ')})`;

            return (
              source.slice(0, matchStart) +
              updatedField +
              source.slice(argsEnd)
            );
          }
          // No args → inject a new one
          const updatedField = `${fieldName}(cursor: "${newCursor}")`;
          return (
            source.slice(0, matchStart) +
              updatedField +
              source.slice(matchEnd)
          );
        }

        // Match target field at current depth
        if (!inString && field && new RegExp(`^\\b${field}\\b`, 'u').test(source.slice(index))) {
          const matchStart = index;
          const matchEnd = index + field.length;

          // Find args and body
          let argsStart = -1;
          let argsEnd = -1;
          let bodyStart = -1;

          index = matchEnd;

          while (/\s/u.test(source[index])) {
            index++;
          }

          // Handle arguments
          if (source[index] === '(') {
            argsStart = index;
            let parenCount = 1;
            index++;
            while (index < source.length && parenCount > 0) {
              if (source[index] === '(') {
                parenCount++;
              } else if (source[index] === ')') {
                parenCount--;
              }
              index++;
            }
            argsEnd = index;
          }

          while (/\s/u.test(source[index])) {
            index++;
          }

          // Handle body
          if (source[index] === '{') {
            bodyStart = index;
          }

          // Leaf field — apply cursor
          if (parts.length === 1) {
            let updatedField = '';

            if (argsStart === -1) {
              updatedField = `${field}(cursor: "${newCursor}")`;
            } else {
              const argsStr = source
                .slice(argsStart + 1, argsEnd - 1)
                .split(',')
                .map(arg => arg.trim())
                .filter(arg => arg && !arg.startsWith('cursor:'));
              argsStr.push(`cursor: "${newCursor}"`);
              updatedField = `${field}(${argsStr.join(', ')})`;
            }

            return source.slice(0, matchStart) + updatedField + source.slice(index);
          }

          // Recursive case
          if (bodyStart !== -1) {
            let braceCount = 1;
            let bodyEnd = bodyStart + 1;
            while (bodyEnd < source.length && braceCount > 0) {
              if (source[bodyEnd] === '{') {
                braceCount++;
              } else if (source[bodyEnd] === '}') {
                braceCount--;
              }
              bodyEnd++;
            }

            const before = source.slice(0, bodyStart + 1);
            const body = source.slice(bodyStart + 1, bodyEnd - 1);
            const after = source.slice(bodyEnd - 1);

            const newBody = insertCursorAtField(body, parts.slice(1), depth + 1);
            return before + newBody + after;
          }
        }

        index++;
      }

      throw new Error(`Unable to update query with cursor ${newCursor} at path ${path}`);
    }

    return insertCursorAtField(query, pathParts);
  }

  public override getProperty<P>(propertyName: string, callback?: (value: P) => void): P | undefined {
    if (propertyName === 'metadata') {
      if (!this.countMetadata) {
        this.countMetadata = new Promise((resolve, reject) => {
          const countQuery = this._updateCursorInQuery(this.query);
          this._query(countQuery).then((response) => {
            const paginations = response?.extensions?.pagination;
            // Try to find the pagination object whose path matches the root of the query
            const rootFieldMatch = /\b([_A-Za-z][_0-9A-Za-z]*)\b\s*(\(|\{)/u.exec(this.query);
            const rootPath = rootFieldMatch ? `/${rootFieldMatch[1]}` : undefined;

            // If found, look up the total count for that root
            const rootPageInfo = rootPath ?
              paginations.find((p: any) => p.path === rootPath) :
              paginations[0];
            const totalCount = rootPageInfo?.totalCount;

            if (totalCount) {
              resolve(<MetadataBindings> {
                state: new MetadataValidationState(),
                cardinality: {
                  type: 'exact',
                  value: totalCount,
                  dataset: this.source,
                },
                variables: [],
              });
            } else {
              resolve(<MetadataBindings> {
                state: new MetadataValidationState(),
                cardinality: {
                  type: 'estimate',
                  value: Number.POSITIVE_INFINITY,
                  dataset: this.source,
                },
                variables: [],
              });
            }
          }).catch(reject);
        });
      }
      this.countMetadata
        .then(metadata => this.setProperty('metadata', metadata))
        .catch(e => this.emit('error', e));
    }
    return super.getProperty(propertyName, callback);
  }
}
