import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus, passTestVoid, failTest } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySourceIdentifyGraphql } from '../lib/ActorQuerySourceIdentifyGraphql';
import 'jest-rdf';

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};
const mediatorHttp: any = {
  mediate: () => ({}),
};
const DF = new DataFactory();

describe('ActorQuerySourceIdentifyGraphql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQuerySourceIdentifyGraphql module', () => {
    it('should be a function', () => {
      expect(ActorQuerySourceIdentifyGraphql).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyGraphql constructor', () => {
      const actor = new (<any> ActorQuerySourceIdentifyGraphql)({
        name: 'actor',
        bus,
        mediatorMergeBindingsContext,
        mediatorHttp,
      });
      expect(actor).toBeInstanceOf(ActorQuerySourceIdentifyGraphql);
      expect(actor).toBeInstanceOf(Object); // Superclass is generic Actor
    });

    it('should not be able to create new objects without "new"', () => {
      expect(() => {
        (<any> ActorQuerySourceIdentifyGraphql)();
      }).toThrow(`Class constructor ActorQuerySourceIdentifyGraphql cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQuerySourceIdentifyGraphql instance', () => {
    let actor: ActorQuerySourceIdentifyGraphql;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyGraphql({
        name: 'actor',
        bus,
        mediatorMergeBindingsContext,
        mediatorHttp,
      });
    });

    describe('test', () => {
      it('should test successfully with graphql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'graphql', value: 'http://example.com/graphql' },
          context: new ActionContext(),
        })).resolves.toStrictEqual(passTestVoid());
      });

      it('should fail test with non-graphql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: 'source' },
          context: new ActionContext(),
        })).resolves.toStrictEqual(failTest(`${actor.name} requires a single query source with graphql type to be present in the context.`));
      });
    });

    describe('run', () => {
      it('should create a QuerySourceGraphql instance', async() => {
        const contextIn = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
        const ret = await actor.run({
          querySourceUnidentified: { type: 'graphql', value: 'http://example.com/graphql' },
          context: contextIn,
        });

        expect(ret.querySource.source.constructor.name).toBe('QuerySourceGraphql');
        expect(ret.querySource.context).not.toBe(contextIn);
      });

      it('should respect provided context', async() => {
        const contextIn = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
        const contextSource = new ActionContext();
        const ret = await actor.run({
          querySourceUnidentified: { type: 'graphql', value: 'http://example.com/graphql', context: contextSource },
          context: contextIn,
        });

        expect(ret.querySource.context).toBe(contextSource);
      });
    });
  });
});
