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
          parentUser: MeFragment_ActiveUser_parentUser_DummyUser | MeFragment_ActiveUser_parentUser_ActiveUser
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
          parentUser: MeFragment_ActiveUser_parentUser_DummyUser | MeFragment_ActiveUser_parentUser_ActiveUser
        }

        export interface OverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: OverlappingFieldsMergingTestQuery_me_DummyUser | OverlappingFieldsMergingTestQuery_me_ActiveUser | null
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
          parentUser: MeFragment_ActiveUser_parentUser_DummyUser | MeFragment_ActiveUser_parentUser_ActiveUser
        }

        export interface NestedOverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: NestedOverlappingFieldsMergingTestQuery_me_DummyUser | NestedOverlappingFieldsMergingTestQuery_me_ActiveUser | null
        }


        export type NestedOverlappingFieldsMergingTestQueryVariables = Exact<{ [key: string]: never; }>;


        export type NestedOverlappingFieldsMergingTestQuery = NestedOverlappingFieldsMergingTestQuery_Query;
        "
      `);
    });
  });

  it.only('Should extract interfaces from multiple fragments', async () => {
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
      // wrapFieldDefinitions: true,
      // TODO: test for mergeFragmentTypes: true, (currently breaks)
      // TODO: test for inlineFragmentTypes: 'combine' (currently breaks output)
    };
    const { content } = await plugin(testSchema, [{ location: 'test-file.ts', document: doc }], config, {
      outputFile: '',
    });
    expect(content).toMatchInlineSnapshot(`
      "export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle {
        __typename: 'ArchivedArticle',
        id: string,
        htmlUrl: string,
        title: string,
        url: string
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_EmailInteraction {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_ChannelAnyInteraction {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction {
        __typename: 'TalkInteraction'
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction {
        __typename: 'NativeMessagingInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_WhatsAppInteraction {
        __typename: 'WhatsAppInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_WeChatInteraction {
        __typename: 'WeChatInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NotImplementedOriginatedFrom {
        __typename: 'NotImplementedOriginatedFrom'
      }

      export type ConvoLogAnswerBotSolutionFragment = {
        __typename: 'AnswerBotSolution',
        id: string,
        timestamp: string,
        article: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle,
        originatedFrom: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_EmailInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_ChannelAnyInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_WhatsAppInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_WeChatInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NotImplementedOriginatedFrom
      };

      export type ConvoLogTalkGenericCallSummaryFragment = {
        __typename: 'TalkPublicCallSummary',
        id: string,
        summary: string
      };

      export type ConvoLogTalkInteractionFragment = {
        __typename: 'TalkInteraction',
        channel: string,
        type: CallType
      };

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction {
        __typename: 'TalkInteraction'
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction {
        __typename: 'NativeMessagingInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WhatsAppInteraction {
        __typename: 'WhatsAppInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WeChatInteraction {
        __typename: 'WeChatInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NotImplementedOriginatedFrom {
        __typename: 'NotImplementedOriginatedFrom'
      }

      type ConvoLogConversationEvent_BrokenConversationEvent_Fragment = {
        __typename: 'BrokenConversationEvent',
        id: string,
        timestamp: string,
        originatedFrom: ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WhatsAppInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WeChatInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NotImplementedOriginatedFrom
      };

      type ConvoLogConversationEvent_AnswerBotSolution_Fragment = {
        __typename: 'AnswerBotSolution',
        id: string,
        timestamp: string,
        originatedFrom: ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WhatsAppInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WeChatInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NotImplementedOriginatedFrom
      };

      type ConvoLogConversationEvent_TalkPublicCallSummary_Fragment = {
        __typename: 'TalkPublicCallSummary',
        id: string,
        timestamp: string,
        originatedFrom: ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WhatsAppInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_WeChatInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NotImplementedOriginatedFrom
      };

      export type ConvoLogConversationEventFragment = ConvoLogConversationEvent_BrokenConversationEvent_Fragment | ConvoLogConversationEvent_AnswerBotSolution_Fragment | ConvoLogConversationEvent_TalkPublicCallSummary_Fragment;

      type MessageEnvelopeData_EmailInteraction_Fragment = {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      };

      type MessageEnvelopeData_ChannelAnyInteraction_Fragment = {
        __typename: 'ChannelAnyInteraction'
      };

      type MessageEnvelopeData_TalkInteraction_Fragment = {
        __typename: 'TalkInteraction'
      };

      type MessageEnvelopeData_NativeMessagingInteraction_Fragment = {
        __typename: 'NativeMessagingInteraction'
      };

      type MessageEnvelopeData_WhatsAppInteraction_Fragment = {
        __typename: 'WhatsAppInteraction'
      };

      type MessageEnvelopeData_WeChatInteraction_Fragment = {
        __typename: 'WeChatInteraction'
      };

      type MessageEnvelopeData_NotImplementedOriginatedFrom_Fragment = {
        __typename: 'NotImplementedOriginatedFrom'
      };

      export type MessageEnvelopeDataFragment = MessageEnvelopeData_EmailInteraction_Fragment | MessageEnvelopeData_ChannelAnyInteraction_Fragment | MessageEnvelopeData_TalkInteraction_Fragment | MessageEnvelopeData_NativeMessagingInteraction_Fragment | MessageEnvelopeData_WhatsAppInteraction_Fragment | MessageEnvelopeData_WeChatInteraction_Fragment | MessageEnvelopeData_NotImplementedOriginatedFrom_Fragment;

      export type AnyChannelOriginatedFromFragment = {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      };

      type ConvoLogOriginatedFrom_EmailInteraction_Fragment = {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      };

      type ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment = {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      };

      type ConvoLogOriginatedFrom_TalkInteraction_Fragment = {
        __typename: 'TalkInteraction'
      };

      type ConvoLogOriginatedFrom_NativeMessagingInteraction_Fragment = {
        __typename: 'NativeMessagingInteraction',
        conversationId?: string | null
      };

      type ConvoLogOriginatedFrom_WhatsAppInteraction_Fragment = {
        __typename: 'WhatsAppInteraction',
        conversationId?: string | null
      };

      type ConvoLogOriginatedFrom_WeChatInteraction_Fragment = {
        __typename: 'WeChatInteraction',
        conversationId?: string | null
      };

      type ConvoLogOriginatedFrom_NotImplementedOriginatedFrom_Fragment = {
        __typename: 'NotImplementedOriginatedFrom'
      };

      export type ConvoLogOriginatedFromFragment = ConvoLogOriginatedFrom_EmailInteraction_Fragment | ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment | ConvoLogOriginatedFrom_TalkInteraction_Fragment | ConvoLogOriginatedFrom_NativeMessagingInteraction_Fragment | ConvoLogOriginatedFrom_WhatsAppInteraction_Fragment | ConvoLogOriginatedFrom_WeChatInteraction_Fragment | ConvoLogOriginatedFrom_NotImplementedOriginatedFrom_Fragment;

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_EmailInteraction {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_ChannelAnyInteraction {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_TalkInteraction {
        __typename: 'TalkInteraction',
        channel: string,
        type: CallType
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction {
        __typename: 'NativeMessagingInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_WhatsAppInteraction {
        __typename: 'WhatsAppInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_WeChatInteraction {
        __typename: 'WeChatInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom {
        __typename: 'NotImplementedOriginatedFrom'
      }

      export type ConvoLogTalkPublicCallSummaryFragment = {
        __typename: 'TalkPublicCallSummary',
        id: string,
        timestamp: string,
        summary: string,
        originatedFrom: ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_EmailInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_ChannelAnyInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_TalkInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_WhatsAppInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_WeChatInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom
      };
      "
    `);

    // const fullContent = await validate(content, config, testSchema);
    // expect(fullContent).toMatchInlineSnapshot();
  });
});
