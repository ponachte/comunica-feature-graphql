import { ActionContextKey } from '@comunica/core';

export const KeysGraphQLSource = {
  /**
   * The GraphQL schema linked to the source
   */
  schema: new ActionContextKey<string>('@comunica/actor-query-source-identify-graphql:schema'),
  /**
   * The LD-context for that source
   */
  context: new ActionContextKey<Record<string, string>>('@comunica/actor-query-source-identify-graphql:context'),
};
