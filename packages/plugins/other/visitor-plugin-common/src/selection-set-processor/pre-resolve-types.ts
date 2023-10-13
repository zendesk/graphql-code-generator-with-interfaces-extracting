import { getBaseType, removeNonNullWrapper } from '@graphql-codegen/plugin-helpers';
import { GraphQLInterfaceType, GraphQLObjectType, isEnumType, isNonNullType } from 'graphql';
import {
  BaseSelectionSetProcessor,
  FieldNameConfig,
  LinkField,
  PrimitiveAliasedFields,
  PrimitiveField,
  ProcessResult,
  SelectionSetProcessorConfig,
} from './base.js';
import {
  TypeNameProperty,
  TypeScriptObjectProperty,
  TypeScriptPrimitiveNever,
  TypeScriptRawTypeReference,
  TypeScriptStringLiteral,
  TypeScriptValue,
} from '../ts-printer.js';

export class PreResolveTypesProcessor extends BaseSelectionSetProcessor<SelectionSetProcessorConfig> {
  transformTypenameField(type: TypeScriptValue, nameConfig: FieldNameConfig): ProcessResult {
    return [
      new TypeNameProperty({
        ...nameConfig,
        value: type,
      }),
      // new TypeScriptObjectProperty({
      //   propertyName: name,
      //   value: new TypeScriptRawTypeReference(type),
      // }),
    ];
  }

  transformPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveField[],
    unsetTypes?: boolean
  ): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    return fields.map(field => {
      const fieldObj = schemaType.getFields()[field.fieldName];

      const baseType = getBaseType(fieldObj.type);
      let typeToUse = baseType.name;

      const useInnerType = field.isConditional && isNonNullType(fieldObj.type);
      const innerType = useInnerType ? removeNonNullWrapper(fieldObj.type) : undefined;

      const nameConfig = this.config.formatNamedField(
        field.fieldName,
        useInnerType ? innerType : fieldObj.type,
        field.isConditional,
        unsetTypes
      );

      if (unsetTypes) {
        return new TypeScriptObjectProperty({
          ...nameConfig,
          value: TypeScriptPrimitiveNever,
        });
      }

      if (isEnumType(baseType)) {
        typeToUse =
          (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
          this.config.convertName(baseType.name, {
            useTypesPrefix: this.config.enumPrefix,
            useTypesSuffix: this.config.enumSuffix,
          });
      } else if (this.config.scalars[baseType.name]) {
        typeToUse = this.config.scalars[baseType.name].output;
      }

      const wrappedType = this.config.wrapTypeWithModifiers(typeToUse, fieldObj.type);

      return new TypeScriptObjectProperty({
        ...nameConfig,
        value: new TypeScriptRawTypeReference(wrappedType),
      });
    });
  }

  transformAliasesPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveAliasedFields[],
    unsetTypes?: boolean
  ): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    return fields.map(aliasedField => {
      if (aliasedField.fieldName === '__typename') {
        const nameConfig = this.config.formatNamedField(aliasedField.alias, null);
        return new TypeScriptObjectProperty({
          ...nameConfig,
          value: new TypeScriptStringLiteral({ literal: schemaType.name }),
        });
      }
      const fieldObj = schemaType.getFields()[aliasedField.fieldName];
      const baseType = getBaseType(fieldObj.type);
      let typeToUse = this.config.scalars[baseType.name]?.output || baseType.name;

      if (isEnumType(baseType)) {
        typeToUse =
          (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
          this.config.convertName(baseType.name, {
            useTypesPrefix: this.config.enumPrefix,
            useTypesSuffix: this.config.enumSuffix,
          });
      }

      const nameConfig = this.config.formatNamedField(aliasedField.alias, fieldObj.type, undefined, unsetTypes);
      if (unsetTypes) {
        return new TypeScriptObjectProperty({
          ...nameConfig,
          value: TypeScriptPrimitiveNever,
        });
      }

      const wrappedType = this.config.wrapTypeWithModifiers(typeToUse, fieldObj.type);

      return new TypeScriptObjectProperty({
        ...nameConfig,
        value: new TypeScriptRawTypeReference(wrappedType),
      });
    });
  }

  transformLinkFields(fields: LinkField[], unsetTypes?: boolean): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    return fields.map(
      field =>
        new TypeScriptObjectProperty({
          ...(field.alias || field.name),
          value: unsetTypes ? TypeScriptPrimitiveNever : field.selectionSet,
        })
    );
  }
}
