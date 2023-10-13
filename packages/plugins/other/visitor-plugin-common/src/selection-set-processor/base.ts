import { GraphQLInterfaceType, GraphQLNamedType, GraphQLObjectType, GraphQLOutputType, Location } from 'graphql';
import { AvoidOptionalsConfig, ConvertNameFn, NormalizedScalarsMap } from '../types.js';
import {
  TypeScriptIntersection,
  TypeScriptObject,
  TypeScriptObjectProperty,
  TypeScriptTypeAlias,
  TypeScriptTypeUsage,
  TypeScriptValue,
  TypeScriptValueWithModifiers,
} from '../ts-printer.js';

export type PrimitiveField = { isConditional: boolean; fieldName: string };
export type PrimitiveAliasedFields = { alias: string; fieldName: string };
export type TSSelectionSet = TypeScriptObject | TypeScriptTypeUsage;
export type LinkField = {
  alias: FieldNameConfig;
  name: FieldNameConfig;
  type: string;
  selectionSet: TypeScriptObject | TypeScriptTypeUsage | TypeScriptValueWithModifiers;
};
export type ProcessResult = null | Array<TypeScriptObjectProperty | TSSelectionSet>;

export type FieldNameConfig = {
  propertyName: string;
  optional?: boolean;
  readonly?: boolean;
};

export type SelectionSetProcessorConfig = {
  namespacedImportName: string | null;
  convertName: ConvertNameFn<any>;
  enumPrefix: boolean | null;
  enumSuffix: boolean | null;
  scalars: NormalizedScalarsMap;
  formatNamedField(
    name: string,
    type?: GraphQLOutputType | GraphQLNamedType | null,
    isConditional?: boolean,
    isOptional?: boolean
  ): FieldNameConfig;
  wrapTypeWithModifiers(baseType: string, type: GraphQLOutputType | GraphQLNamedType): string;
  avoidOptionals?: AvoidOptionalsConfig | boolean;
  printFieldsOnNewLines?: boolean;
};

export class BaseSelectionSetProcessor<Config extends SelectionSetProcessorConfig = SelectionSetProcessorConfig> {
  typeCache = new Map<Location, Map<string, TypeScriptTypeAlias>>();

  constructor(public config: Config) {}

  buildFieldsIntoObject(allObjectsMerged: TypeScriptObjectProperty[]) {
    if (this.config.printFieldsOnNewLines) {
      return new TypeScriptObject({ properties: allObjectsMerged });
    }
    return `{ ${allObjectsMerged.join(', ')} }`;
  }

  buildSelectionSetFromPieces(pieces: TSSelectionSet[]) {
    if (pieces.length === 0) {
      return null;
    }
    if (pieces.length === 1) {
      return pieces[0];
    }
    return new TypeScriptIntersection({ members: pieces });
  }

  transformPrimitiveFields(
    _schemaType: GraphQLObjectType | GraphQLInterfaceType,
    _fields: PrimitiveField[],
    _unsetTypes?: boolean
  ): ProcessResult {
    throw new Error(
      `Please override "transformPrimitiveFields" as part of your BaseSelectionSetProcessor implementation!`
    );
  }

  transformAliasesPrimitiveFields(
    _schemaType: GraphQLObjectType | GraphQLInterfaceType,
    _fields: PrimitiveAliasedFields[],
    _unsetTypes?: boolean
  ): ProcessResult {
    throw new Error(
      `Please override "transformAliasesPrimitiveFields" as part of your BaseSelectionSetProcessor implementation!`
    );
  }

  transformLinkFields(_fields: LinkField[], _unsetTypes?: boolean): ProcessResult {
    throw new Error(`Please override "transformLinkFields" as part of your BaseSelectionSetProcessor implementation!`);
  }

  transformTypenameField(_type: TypeScriptValue, _nameConfig: FieldNameConfig): ProcessResult {
    // TODO: what about optionality? it's not being accounted for when this is used
    throw new Error(
      `Please override "transformTypenameField" as part of your BaseSelectionSetProcessor implementation!`
    );
  }
}
