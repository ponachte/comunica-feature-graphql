import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionContext } from '@comunica/types';
import { AsyncResourceIterator, flattenResponse } from '../lib/AsyncResourceIterator';
import type { Resource } from '../lib/AsyncResourceIterator';

// Utility to flush async iterators
async function collectAll(iter: AsyncResourceIterator): Promise<Resource[]> {
  return await iter.toArray();
}

describe('flattenResponse', () => {
  it('flattens a simple object', () => {
    const obj = { a: 1, b: 2 };
    const result = flattenResponse(obj);
    expect(result).toEqual([{ a: 1, b: 2 }]);
  });

  it('flattens nested objects', () => {
    const obj = { user: { name: 'Alice', age: 30 }};
    const result = flattenResponse(obj);
    expect(result).toEqual([{ user_name: 'Alice', user_age: 30 }]);
  });

  it('flattens arrays inside objects', () => {
    const obj = { users: [{ name: 'Alice' }, { name: 'Bob' }]};
    const result = flattenResponse(obj);
    expect(result).toEqual([{ users_name: 'Alice' }, { users_name: 'Bob' }]);
  });

  it('flattens arrays of primitives', () => {
    const obj = [ 1, 2, 3 ];
    const result = flattenResponse(obj, 'num');
    expect(result).toEqual([{ num: 1 }, { num: 2 }, { num: 3 }]);
  });

  it('flattens arrays of objects with prefix', () => {
    const obj = [{ name: 'Alice' }, { name: 'Bob' }];
    const result = flattenResponse(obj, 'user');
    expect(result).toEqual([{ user_name: 'Alice' }, { user_name: 'Bob' }]);
  });
});

describe('AsyncResourceIterator', () => {
  let mediatorHttp: jest.Mocked<MediatorHttp>;
  let context: IActionContext;

  beforeEach(() => {
    mediatorHttp = <any>{
      mediate: jest.fn(),
    };
    context = <IActionContext>{};
  });

  it('should fetch and flatten a single-page response', async() => {
    mediatorHttp.mediate.mockResolvedValue(new Response(
      JSON.stringify({ data: { users: [{ name: 'Alice' }, { name: 'Bob' }]}}),
      { status: 200, headers: { 'Content-Type': 'application/json' }},
    ));

    const iter = new AsyncResourceIterator('http://example.org', 'users { name }', context, mediatorHttp);
    const results = await collectAll(iter);

    expect(results).toEqual([
      { users_name: 'Alice' },
      { users_name: 'Bob' },
    ]);

    expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
  });

  it('should paginate when extensions.pagination is present', async() => {
    mediatorHttp.mediate.mockResolvedValueOnce(new Response(
      JSON.stringify({
        data: { users: [{ name: 'Alice' }]},
        extensions: { pagination: [{ path: '/users', next: 'CURSOR1' }]},
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' }},
    ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          data: { users: [{ name: 'Bob' }]},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' }},
      ));

    const iter = new AsyncResourceIterator('http://example.org', 'users { name }', context, mediatorHttp);
    const results = await collectAll(iter);

    expect(results).toEqual([
      { users_name: 'Alice' },
      { users_name: 'Bob' },
    ]);

    // Query string should have been updated with cursor
    expect(iter.query).toContain('cursor: "CURSOR1"');
    expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
  });

  it('should throw on non-ok HTTP responses', async() => {
    mediatorHttp.mediate.mockResolvedValue(
      new Response('server exploded', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const iter = new AsyncResourceIterator('http://example.org', 'users { name }', context, mediatorHttp);

    await expect(collectAll(iter)).rejects.toThrow(
      /HTTP 500 Internal Server Error: server exploded/u,
    );
  });

  it('should handle body stream errors', async() => {
    // Mock mediatorHttp.mediate to return a non-ok response
    mediatorHttp.mediate.mockResolvedValue(<Response><unknown>{
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      // Text() fails to simulate body read error
      text: jest.fn().mockRejectedValue(new Error('stream error')),
      json: jest.fn(),
      headers: new Headers(),
    });

    const iter = new AsyncResourceIterator('http://example.org', 'users { name }', context, mediatorHttp);

    await expect(collectAll(iter)).rejects.toThrow(
      /HTTP 500 Internal Server Error: <failed to read body>/u,
    );
  });

  it('should close when no pagination is present', async() => {
    mediatorHttp.mediate.mockResolvedValue(new Response(
      JSON.stringify({
        data: { users: [{ name: 'Alice' }]},
        extensions: { pagination: []},
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' }},
    ));

    const iter = new AsyncResourceIterator('http://example.org', 'users { name }', context, mediatorHttp);
    const results = await collectAll(iter);

    expect(results).toEqual([{ users_name: 'Alice' }]);
    expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
  });
});

describe('_updateCursorInQuery', () => {
  let iterator: AsyncResourceIterator;

  beforeEach(() => {
    iterator = new AsyncResourceIterator('http://example.org', '', <any>{}, <any>{ mediate: jest.fn() });
  });

  it('inserts cursor when no args exist', () => {
    const query = 'users { name }';
    const updated = (<any>iterator)._updateCursorInQuery(query, '/users', 'CURSOR1');
    expect(updated).toContain('users(cursor: "CURSOR1")');
  });

  it('adds cursor to existing args', () => {
    const query = 'users(limit: 10) { name }';
    const updated = (<any>iterator)._updateCursorInQuery(query, '/users', 'CURSOR1');
    expect(updated).toContain('users(limit: 10, cursor: "CURSOR1")');
  });

  it('inserts cursor at nested path', () => {
    const query = 'users { posts { title } }';
    const updated = (<any>iterator)._updateCursorInQuery(query, '/users/posts', 'CURSOR2');
    expect(updated).toContain('posts(cursor: "CURSOR2")');
  });

  it('does not insert inside string literals', () => {
    const query = 'users { field(arg: "users test") }';
    const updated = (<any>iterator)._updateCursorInQuery(query, '/users/field', 'CURSOR3');
    // Cursor should still be added but not break the string
    expect(updated).toMatch(/cursor: "CURSOR3"/u);
    expect(updated).toMatch(/"users test"/u);
  });

  it('handles multiple paginations by choosing the deepest path', async() => {
    const mediatorHttp: any = {
      mediate: jest.fn()
        .mockResolvedValueOnce(new Response(
          JSON.stringify({
            data: { users: [{ name: 'Alice' }]},
            extensions: {
              pagination: [
                { path: '/users', next: 'CURSOR1' },
                { path: '/users/posts', next: 'CURSOR2' }, // Deeper
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' }},
        ))
        .mockResolvedValueOnce(new Response(
          JSON.stringify({ data: { users: [{ name: 'Bob' }]}}),
          { status: 200, headers: { 'Content-Type': 'application/json' }},
        )),
    };

    const it = new AsyncResourceIterator('http://example.org', 'users { posts { title } }', <any>{}, mediatorHttp);
    const results = await it.toArray();

    // Query should have used CURSOR2 because it's deeper
    expect(it.query).toContain('posts(cursor: "CURSOR2")');
    expect(results.length).toBeGreaterThan(0);
  });

  it('throws an error if the field path is not found', () => {
    const query = 'users { name }';
    const path = '/nonexistentField';
    const cursor = 'CURSOR4';

    expect(() => {
      (<any>iterator)._updateCursorInQuery(query, path, cursor);
    }).toThrow(
      new RegExp(`Unable to update query with cursor ${cursor} at path ${path}`, 'u'),
    );
  });
});
