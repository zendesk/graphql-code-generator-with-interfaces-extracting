// import { mergeOutputs, Types } from '@graphql-codegen/plugin-helpers';
// import { validateTs } from '@graphql-codegen/testing';
import { buildSchema, parse } from 'graphql';
// import { plugin as tsPlugin } from '../../typescript/src/index.js';
import { plugin, TypeScriptDocumentsPluginConfig } from '../src/index.js';

describe('ExtractTypes', () => {
  // const gitHuntSchema = buildClientSchema(require('../../../../../dev-test/githunt/schema.json'));

  // const validate = async (
  //   content: Types.PluginOutput,
  //   config: any = {},
  //   pluginSchema,
  //   usage = '',
  //   suspenseErrors = []
  // ) => {
  //   const m = mergeOutputs([await tsPlugin(pluginSchema, [], config, { outputFile: '' }), content, usage]);
  //   validateTs(m, undefined, undefined, undefined, suspenseErrors);

  //   return m;
  // };

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
        query NestedOverlappingFieldsMergingTest {
          # an optimization here would be for these to merge,
          # since ParentMe selects for the same things as the field selection in: me { id }
          me {
            ...Me
            ... on ActiveUser {
              isActive
            }
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

        export interface MeFragment_ActiveUser_parentUser_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface MeFragment_ActiveUser_parentUser_ActiveUser {
          __typename: 'ActiveUser',
          id: string,
          joinDate: any
        }

        export type MeFragment_ActiveUser_parentUser = MeFragment_ActiveUser_parentUser_DummyUser | MeFragment_ActiveUser_parentUser_ActiveUser;

        type Me_DummyUser_Fragment = {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        };

        type Me_ActiveUser_Fragment = {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        };

        export type MeFragment = Me_DummyUser_Fragment | Me_ActiveUser_Fragment;

        export interface OverlappingFieldsMergingTestQuery_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface OverlappingFieldsMergingTestQuery_me_ActiveUser {
          __typename: 'ActiveUser',
          id: string,
          isActive: boolean,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        }

        export type OverlappingFieldsMergingTestQuery_me = OverlappingFieldsMergingTestQuery_me_DummyUser | OverlappingFieldsMergingTestQuery_me_ActiveUser;

        export interface OverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: OverlappingFieldsMergingTestQuery_me | null
        }


        export type OverlappingFieldsMergingTestQueryVariables = Exact<{ [key: string]: never; }>;


        export type OverlappingFieldsMergingTestQuery = OverlappingFieldsMergingTestQuery_Query;

        export interface NestedOverlappingFieldsMergingTestQuery_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface NestedOverlappingFieldsMergingTestQuery_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        }

        export type NestedOverlappingFieldsMergingTestQuery_me = NestedOverlappingFieldsMergingTestQuery_me_DummyUser | NestedOverlappingFieldsMergingTestQuery_me_ActiveUser;

        export interface NestedOverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: NestedOverlappingFieldsMergingTestQuery_me | null
        }


        export type NestedOverlappingFieldsMergingTestQueryVariables = Exact<{ [key: string]: never; }>;


        export type NestedOverlappingFieldsMergingTestQuery = NestedOverlappingFieldsMergingTestQuery_Query;
        "
      `);
    });
  });

  it('Should extract interfaces from multiple fragments', async () => {
    const testSchema = buildSchema(/* GraphQL */ `
      #scalar Date
      #type Query {
      #  me: User
      #}

      interface TalkGenericCallSummary {
        id: ID!
        timestamp: String!

        summary: String!
        sanitizedHTMLContent: String!
        isTranscriptionVisible: Boolean!

        formattedFrom: String!
        formattedTo: String!
        isTrusted: Boolean!
      }

      type CallerID {
        phone: String!
        formattedPhone: String!
        name: String
      }

      enum CallType {
        OUTGOING
        INCOMING
        VOICEMAIL
        UNKNOWN
      }

      type TalkInteraction {
        channel: String!
        rel: String

        type: CallType!

        from: CallerID
        to: CallerID
      }

      interface ConnectionNode {
        id: ID!
      }

      interface ConversationEvent implements ConnectionNode {
        id: ID!
        timestamp: String!
        originatedFrom: OriginatedFrom!
      }

      type BrokenConversationEvent implements ConversationEvent & ConnectionNode {
        id: ID!
        timestamp: String!

        originatedFrom: OriginatedFrom!
        extraField: String!
      }

      union OriginatedFrom =
          EmailInteraction
        | ChannelAnyInteraction
        | TalkInteraction
        | NativeMessagingInteraction
        | WhatsAppInteraction
        | WeChatInteraction
        | NotImplementedOriginatedFrom

      type NotImplementedOriginatedFrom {
        channel: String
        rel: String
      }

      type EmailInteraction {
        originalEmailURLPath: String!
      }

      interface ChannelInteraction {
        externalId: String!
        timestamp: String!
        resourceType: String!
        version: Int!
        isAllowingChannelback: Boolean!
      }

      type ChannelAnyInteraction implements ChannelInteraction {
        externalId: String!
        timestamp: String!
        resourceType: String!
        version: Int!
        isAllowingChannelback: Boolean!
      }

      interface SunshineConversation {
        conversationId: ID
      }

      type NativeMessagingInteraction implements SunshineConversation {
        conversationId: ID
      }

      type WhatsAppInteraction implements SunshineConversation {
        conversationId: ID
      }

      type WeChatInteraction implements SunshineConversation {
        conversationId: ID
      }

      type ArchivedArticle {
        id: ID!
        title: String!
        url: String!
        htmlUrl: String!
      }

      type AnswerBotSolution implements ConnectionNode & ConversationEvent {
        id: ID!
        timestamp: String!
        originatedFrom: OriginatedFrom!

        article: ArchivedArticle!
      }

      type TalkPublicCallSummary implements ConnectionNode & ConversationEvent & TalkGenericCallSummary {
        id: ID!
        timestamp: String!

        summary: String!
        sanitizedHTMLContent: String!
        isTranscriptionVisible: Boolean!

        formattedFrom: String!
        formattedTo: String!
        isTrusted: Boolean!

        originatedFrom: OriginatedFrom!
      }
    `);

    const doc = parse(/* GraphQL */ `
      fragment ConvoLogAnswerBotSolution on AnswerBotSolution {
        id
        ...ConvoLogConversationEvent
        article {
          id
          htmlUrl
          title
          url
        }
        originatedFrom {
          ...ConvoLogOriginatedFrom
        }
      }

      fragment ConvoLogTalkGenericCallSummary on TalkGenericCallSummary {
        id
        summary
      }
      fragment ConvoLogTalkInteraction on TalkInteraction {
        channel
        type
      }
      fragment ConvoLogConversationEvent on ConversationEvent {
        __typename
        id
        timestamp
        originatedFrom {
          ...ConvoLogOriginatedFrom
        }
      }

      fragment MessageEnvelopeData on OriginatedFrom {
        ... on EmailInteraction {
          originalEmailURLPath
        }
      }

      fragment AnyChannelOriginatedFrom on ChannelAnyInteraction {
        externalId
        timestamp
        resourceType
      }

      fragment ConvoLogOriginatedFrom on OriginatedFrom {
        __typename
        ... on SunshineConversation {
          conversationId
        }
        ...MessageEnvelopeData
        ...AnyChannelOriginatedFrom
      }

      fragment ConvoLogTalkPublicCallSummary on TalkPublicCallSummary {
        id
        ...ConvoLogConversationEvent
        ...ConvoLogTalkGenericCallSummary
        originatedFrom {
          ... on TalkInteraction {
            ...ConvoLogTalkInteraction
          }
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
      mergeFragmentTypes: true,
      // inlineFragmentTypes: 'mask',
      // inlineFragmentTypes: 'combine',
      // wrapFieldDefinitions: true,
      // TODO: test for mergeFragmentTypes: true, (currently breaks)
      // TODO: test for inlineFragmentTypes: 'combine' (currently breaks output)
    };
    const { content } = await plugin(testSchema, [{ location: 'test-file.ts', document: doc }], config, {
      outputFile: '',
    });
    expect(content).toMatchInlineSnapshot(`
      "export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle = (
        {
        id: string,
        htmlUrl: string,
        title: string,
        url: string
      }
        & {
        __typename: 'ArchivedArticle'
      }
      );

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_EmailInteraction = (
        {
        originalEmailURLPath: string
      }
        & {
        __typename: 'EmailInteraction'
      }
      );

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_ChannelAnyInteraction = (
        {
        externalId: string,
        timestamp: string,
        resourceType: string
      }
        & {
        __typename: 'ChannelAnyInteraction'
      }
      );

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom = {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      };

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction = (
        {
        conversationId?: string | null
      }
        & {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction'
      }
      );

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom = ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_EmailInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_ChannelAnyInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction;

      export type ConvoLogAnswerBotSolutionFragment = (
        {
        id: string,
        timestamp: string,
        article: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle,
        originatedFrom: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom
      }
        & {
        __typename: 'AnswerBotSolution'
      }
      );

      export type ConvoLogTalkGenericCallSummaryFragment = (
        {
        id: string,
        summary: string
      }
        & {
        __typename: 'TalkPublicCallSummary'
      }
      );

      export type ConvoLogTalkInteractionFragment = (
        {
        channel: string,
        type: CallType
      }
        & {
        __typename: 'TalkInteraction'
      }
      );

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction = (
        {
        originalEmailURLPath: string
      }
        & {
        __typename: 'EmailInteraction'
      }
      );

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction = (
        {
        externalId: string,
        timestamp: string,
        resourceType: string
      }
        & {
        __typename: 'ChannelAnyInteraction'
      }
      );

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom = {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      };

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction = (
        {
        conversationId?: string | null
      }
        & {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction'
      }
      );

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom = ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction;

      export type ConvoLogConversationEventFragment = (
        {
        id: string,
        timestamp: string,
        originatedFrom: ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom
      }
        & {
        __typename: 'BrokenConversationEvent' | 'AnswerBotSolution' | 'TalkPublicCallSummary'
      }
      );

      type MessageEnvelopeData_EmailInteraction_Fragment = (
        {
        originalEmailURLPath: string
      }
        & {
        __typename: 'EmailInteraction'
      }
      );

      type MessageEnvelopeData_L2FjOkUrGUlRHrYBlLrKrZLjPf5Auo7b7u3C5Sh2U_Fragment = {
        __typename: 'ChannelAnyInteraction' | 'TalkInteraction' | 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction' | 'NotImplementedOriginatedFrom'
      };

      export type MessageEnvelopeDataFragment = MessageEnvelopeData_EmailInteraction_Fragment | MessageEnvelopeData_L2FjOkUrGUlRHrYBlLrKrZLjPf5Auo7b7u3C5Sh2U_Fragment;

      export type AnyChannelOriginatedFromFragment = (
        {
        externalId: string,
        timestamp: string,
        resourceType: string
      }
        & {
        __typename: 'ChannelAnyInteraction'
      }
      );

      type ConvoLogOriginatedFrom_EmailInteraction_Fragment = (
        {
        originalEmailURLPath: string
      }
        & {
        __typename: 'EmailInteraction'
      }
      );

      type ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment = (
        {
        externalId: string,
        timestamp: string,
        resourceType: string
      }
        & {
        __typename: 'ChannelAnyInteraction'
      }
      );

      type ConvoLogOriginatedFrom_TalkInteraction_NotImplementedOriginatedFrom_Fragment = {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      };

      type ConvoLogOriginatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction_Fragment = (
        {
        conversationId?: string | null
      }
        & {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction'
      }
      );

      export type ConvoLogOriginatedFromFragment = ConvoLogOriginatedFrom_EmailInteraction_Fragment | ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment | ConvoLogOriginatedFrom_TalkInteraction_NotImplementedOriginatedFrom_Fragment | ConvoLogOriginatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction_Fragment;

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_EmailInteraction = (
        {
        originalEmailURLPath: string
      }
        & {
        __typename: 'EmailInteraction'
      }
      );

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_ChannelAnyInteraction = (
        {
        externalId: string,
        timestamp: string,
        resourceType: string
      }
        & {
        __typename: 'ChannelAnyInteraction'
      }
      );

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_TalkInteraction = (
        {
        channel: string,
        type: CallType
      }
        & {
        __typename: 'TalkInteraction'
      }
      );

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction = (
        {
        conversationId?: string | null
      }
        & {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction'
      }
      );

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom = {
        __typename: 'NotImplementedOriginatedFrom'
      };

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom = ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_EmailInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_ChannelAnyInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_TalkInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom;

      export type ConvoLogTalkPublicCallSummaryFragment = (
        {
        id: string,
        timestamp: string,
        summary: string,
        originatedFrom: ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom
      }
        & {
        __typename: 'TalkPublicCallSummary'
      }
      );
      "
    `);

    // const fullContent = await validate(content, config, testSchema);
    // expect(fullContent).toMatchInlineSnapshot();
  });
});
