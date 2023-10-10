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
        "//#region UserFragment (Fragment) defined in: GraphQL request:9:82

        export interface UserFragment_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface UserFragment_ActiveUser {
          __typename: 'ActiveUser',
          id: string,
          joinDate: any
        }

        export type UserFragment = UserFragment_DummyUser | UserFragment_ActiveUser;

        //#endregion UserFragment (Fragment)

        //#region Me (Fragment) defined in: GraphQL request:91:293

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

        export interface Me_DummyUser_Fragment {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface Me_ActiveUser_Fragment {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        }

        export type MeFragment = Me_DummyUser_Fragment | Me_ActiveUser_Fragment;

        //#endregion Me (Fragment)

        //#region OverlappingFieldsMergingTest (Operation) defined in: GraphQL request:302:503

        export interface OverlappingFieldsMergingTestQuery_Query_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface OverlappingFieldsMergingTestQuery_Query_me_ActiveUser {
          __typename: 'ActiveUser',
          id: string,
          isActive: boolean,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        }

        export type OverlappingFieldsMergingTestQuery_Query_me = OverlappingFieldsMergingTestQuery_Query_me_DummyUser | OverlappingFieldsMergingTestQuery_Query_me_ActiveUser;

        export interface OverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: OverlappingFieldsMergingTestQuery_Query_me | null
        }

        export type OverlappingFieldsMergingTestQuery = OverlappingFieldsMergingTestQuery_Query;

        export type OverlappingFieldsMergingTestQueryVariables = Exact<{ [key: string]: never; }>;

        //#endregion OverlappingFieldsMergingTest (Operation)

        //#region NestedOverlappingFieldsMergingTest (Operation) defined in: GraphQL request:512:832

        export interface NestedOverlappingFieldsMergingTestQuery_Query_me_DummyUser {
          __typename: 'DummyUser',
          id: string,
          joinDate: any
        }

        export interface NestedOverlappingFieldsMergingTestQuery_Query_me_ActiveUser {
          __typename: 'ActiveUser',
          isActive: boolean,
          id: string,
          joinDate: any,
          parentUser: MeFragment_ActiveUser_parentUser
        }

        export type NestedOverlappingFieldsMergingTestQuery_Query_me = NestedOverlappingFieldsMergingTestQuery_Query_me_DummyUser | NestedOverlappingFieldsMergingTestQuery_Query_me_ActiveUser;

        export interface NestedOverlappingFieldsMergingTestQuery_Query {
          __typename: 'Query',
          me?: NestedOverlappingFieldsMergingTestQuery_Query_me | null
        }

        export type NestedOverlappingFieldsMergingTestQuery = NestedOverlappingFieldsMergingTestQuery_Query;

        export type NestedOverlappingFieldsMergingTestQueryVariables = Exact<{ [key: string]: never; }>;

        //#endregion NestedOverlappingFieldsMergingTest (Operation)
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
      "//#region ConvoLogAnswerBotSolution (Fragment) defined in: GraphQL request:7:280

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle {
        __typename: 'ArchivedArticle',
        id: string,
        htmlUrl: string,
        title: string,
        url: string
      }

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article = ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article_ArchivedArticle;

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

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      }

      export interface ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction',
        conversationId?: string | null
      }

      export type ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom = ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_EmailInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_ChannelAnyInteraction | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom | ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction;

      export interface ConvoLogAnswerBotSolutionFragment {
        __typename: 'AnswerBotSolution',
        id: string,
        timestamp: string,
        article: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_article,
        originatedFrom: ConvoLogAnswerBotSolutionFragment_AnswerBotSolution_originatedFrom
      }

      //#endregion ConvoLogAnswerBotSolution (Fragment)

      //#region ConvoLogTalkGenericCallSummary (Fragment) defined in: GraphQL request:288:390

      export interface ConvoLogTalkGenericCallSummaryFragment {
        __typename: 'TalkPublicCallSummary',
        id: string,
        summary: string
      }

      //#endregion ConvoLogTalkGenericCallSummary (Fragment)

      //#region ConvoLogTalkInteraction (Fragment) defined in: GraphQL request:397:487

      export interface ConvoLogTalkInteractionFragment {
        __typename: 'TalkInteraction',
        channel: string,
        type: CallType
      }

      //#endregion ConvoLogTalkInteraction (Fragment)

      //#region ConvoLogConversationEvent (Fragment) defined in: GraphQL request:494:678

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

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      }

      export interface ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction',
        conversationId?: string | null
      }

      export type ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom = ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_EmailInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_ChannelAnyInteraction | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_TalkInteraction_NotImplementedOriginatedFrom | ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction;

      export interface ConvoLogConversationEventFragment {
        __typename: 'BrokenConversationEvent' | 'AnswerBotSolution' | 'TalkPublicCallSummary',
        id: string,
        timestamp: string,
        originatedFrom: ConvoLogConversationEventFragment_BrokenConversationEvent_originatedFrom
      }

      //#endregion ConvoLogConversationEvent (Fragment)

      //#region MessageEnvelopeData (Fragment) defined in: GraphQL request:686:817

      export interface MessageEnvelopeData_EmailInteraction_Fragment {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      }

      export interface MessageEnvelopeData_L2FjOkUrGUlRHrYBlLrKrZLjPf5Auo7b7u3C5Sh2U_Fragment {
        __typename: 'ChannelAnyInteraction' | 'TalkInteraction' | 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction' | 'NotImplementedOriginatedFrom'
      }

      export type MessageEnvelopeDataFragment = MessageEnvelopeData_EmailInteraction_Fragment | MessageEnvelopeData_L2FjOkUrGUlRHrYBlLrKrZLjPf5Auo7b7u3C5Sh2U_Fragment;

      //#endregion MessageEnvelopeData (Fragment)

      //#region AnyChannelOriginatedFrom (Fragment) defined in: GraphQL request:825:951

      export interface AnyChannelOriginatedFromFragment {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      }

      //#endregion AnyChannelOriginatedFrom (Fragment)

      //#region ConvoLogOriginatedFrom (Fragment) defined in: GraphQL request:959:1177

      export interface ConvoLogOriginatedFrom_EmailInteraction_Fragment {
        __typename: 'EmailInteraction',
        originalEmailURLPath: string
      }

      export interface ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment {
        __typename: 'ChannelAnyInteraction',
        externalId: string,
        timestamp: string,
        resourceType: string
      }

      export interface ConvoLogOriginatedFrom_TalkInteraction_NotImplementedOriginatedFrom_Fragment {
        __typename: 'TalkInteraction' | 'NotImplementedOriginatedFrom'
      }

      export interface ConvoLogOriginatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction_Fragment {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction',
        conversationId?: string | null
      }

      export type ConvoLogOriginatedFromFragment = ConvoLogOriginatedFrom_EmailInteraction_Fragment | ConvoLogOriginatedFrom_ChannelAnyInteraction_Fragment | ConvoLogOriginatedFrom_TalkInteraction_NotImplementedOriginatedFrom_Fragment | ConvoLogOriginatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction_Fragment;

      //#endregion ConvoLogOriginatedFrom (Fragment)

      //#region ConvoLogTalkPublicCallSummary (Fragment) defined in: GraphQL request:1185:1469

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

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction {
        __typename: 'NativeMessagingInteraction' | 'WhatsAppInteraction' | 'WeChatInteraction',
        conversationId?: string | null
      }

      export interface ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom {
        __typename: 'NotImplementedOriginatedFrom'
      }

      export type ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom = ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_EmailInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_ChannelAnyInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_TalkInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NativeMessagingInteraction_WhatsAppInteraction_WeChatInteraction | ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom_NotImplementedOriginatedFrom;

      export interface ConvoLogTalkPublicCallSummaryFragment {
        __typename: 'TalkPublicCallSummary',
        id: string,
        timestamp: string,
        summary: string,
        originatedFrom: ConvoLogTalkPublicCallSummaryFragment_TalkPublicCallSummary_originatedFrom
      }

      //#endregion ConvoLogTalkPublicCallSummary (Fragment)
      "
    `);

    // const fullContent = await validate(content, config, testSchema);
    // expect(fullContent).toMatchInlineSnapshot();
  });
});
