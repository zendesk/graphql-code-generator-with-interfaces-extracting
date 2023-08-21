import { mergeOutputs, Types } from '@graphql-codegen/plugin-helpers';
import { validateTs } from '@graphql-codegen/testing';
import { buildSchema, parse } from 'graphql';
import { plugin as tsPlugin } from '../../typescript/src/index.js';
import { plugin, TypeScriptDocumentsPluginConfig } from '../src/index.js';

describe('ExtractTypes', () => {
  // const gitHuntSchema = buildClientSchema(require('../../../../../dev-test/githunt/schema.json'));

  const validate = async (
    content: Types.PluginOutput,
    config: any = {},
    pluginSchema,
    usage = '',
    suspenseErrors = []
  ) => {
    const m = mergeOutputs([await tsPlugin(pluginSchema, [], config, { outputFile: '' }), content, usage]);
    validateTs(m, undefined, undefined, undefined, suspenseErrors);

    return m;
  };

  describe('Extract interfaces', () => {
    it('Should extract interfaces', async () => {
      const testSchema = buildSchema(/* GraphQL */ `
        scalar Date
        type Query {
          me: User
        }
        interface User {
          id: ID!
          joinDate: Date!
        }
        type DummyUser implements User {
          id: ID!
          joinDate: Date!
        }
        type ActiveUser implements User {
          id: ID!
          joinDate: Date!
          isActive: Boolean!
          parentUser: User!
          thing: String!
        }
      `);

      const doc = parse(/* GraphQL */ `
        fragment UserFragment on User {
          id
          joinDate
        }
        fragment Me on User {
          id
          ...UserFragment
          ... on ActiveUser {
            isActive
            parentUser {
              ...UserFragment
            }
          }
        }
        query OverlappingFieldsMergingTest {
          # this should be optimized to be: me { ...Me } since they're both selecting for 'id'
          me {
            id
            ...Me
          }
        }
        fragment ParentMe on Query {
          me {
            ...Me
          }
        }
        query NestedOverlappingFieldsMergingTest {
          # an optimization here would be for these to merge,
          # since ParentMe selects for the same things as the field selection in: me { id }
          ...ParentMe
          me {
            id
          }
        }
      `);

      const config: TypeScriptDocumentsPluginConfig = {
        preResolveTypes: true,
        extractAllTypes: true,
        nonOptionalTypename: true,
        declarationKind: {
          arguments: 'interface',
          type: 'interface',
          directive: 'interface',
          input: 'interface',
          interface: 'interface',
          scalar: 'interface',
        },
        dedupeOperationSuffix: true,
        // wrapFieldDefinitions: true,
        // TODO: test for mergeFragmentTypes: true, (currently breaks)
        // TODO: test for inlineFragmentTypes: 'combine' (currently breaks output)
      };
      const { content } = await plugin(testSchema, [{ location: 'test-file.ts', document: doc }], config, {
        outputFile: '',
      });
      expect(content).toMatchInlineSnapshot(`
        "type UserFragment_DummyUser = {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        };

        type UserFragment_ActiveUser = {
          __typename: 'ActiveUser',
          id: string,
          joinDate: any
        };

        export type UserFragment = UserFragment_DummyUser | UserFragment_ActiveUser;

        export interface MeFragment_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface MeFragment_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: UserFragment
        }

        export type MeFragment = {
          __typename: 'Query',
          me?: MeFragment_me_DummyUser | MeFragment_me_ActiveUser | null
        };

        export interface GetMeQuery_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface GetMeQuery_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: UserFragment
        }

        export interface GetMeQuery_Query {
          __typename: 'Query',
          me?: GetMeQuery_me_DummyUser | GetMeQuery_me_ActiveUser | null
        }


        export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


        export type GetMeQuery = GetMeQuery_Query;
        "
      `);
      // expect(content).toContain(`Pick<User, 'id' | 'joinDate'>`);
      const fullContent = await validate(content, config, testSchema);
      expect(fullContent).toMatchInlineSnapshot(`
        "export type Maybe<T> = T | null;
        export type InputMaybe<T> = Maybe<T>;
        export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
        export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
        export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
        export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
        /** All built-in and custom scalars, mapped to their actual values */
        export interface Scalars {
          ID: { input: string; output: string; }
          String: { input: string; output: string; }
          Boolean: { input: boolean; output: boolean; }
          Int: { input: number; output: number; }
          Float: { input: number; output: number; }
          Date: { input: any; output: any; }
        }

        export interface Query {
          __typename: 'Query';
          me?: Maybe<User>;
        }

        export interface User {
          id: Scalars['ID']['output'];
          joinDate: Scalars['Date']['output'];
        }

        export interface DummyUser extends User {
          __typename: 'DummyUser';
          id: Scalars['ID']['output'];
          joinDate: Scalars['Date']['output'];
        }

        export interface ActiveUser extends User {
          __typename: 'ActiveUser';
          id: Scalars['ID']['output'];
          joinDate: Scalars['Date']['output'];
          isActive: Scalars['Boolean']['output'];
          parentUser: User;
          thing: Scalars['String']['output'];
        }
        type UserFragment_DummyUser = {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        };

        type UserFragment_ActiveUser = {
          __typename: 'ActiveUser',
          id: string,
          joinDate: any
        };

        export type UserFragment = UserFragment_DummyUser | UserFragment_ActiveUser;

        export interface MeFragment_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface MeFragment_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: UserFragment
        }

        export type MeFragment = {
          __typename: 'Query',
          me?: MeFragment_me_DummyUser | MeFragment_me_ActiveUser | null
        };

        export interface GetMeQuery_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface GetMeQuery_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: UserFragment
        }

        export interface GetMeQuery_Query {
          __typename: 'Query',
          me?: GetMeQuery_me_DummyUser | GetMeQuery_me_ActiveUser | null
        }


        export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


        export type GetMeQuery = GetMeQuery_Query;
        "
      `);
    });
  });
});
