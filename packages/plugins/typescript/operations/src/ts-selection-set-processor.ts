import {
  BaseSelectionSetProcessor,
  FieldNameConfig,
  LinkField,
  PrimitiveAliasedFields,
  PrimitiveField,
  ProcessResult,
  SelectionSetProcessorConfig,
  TypeNameProperty,
  TypeScriptObject,
  TypeScriptObjectProperty,
  TypeScriptRawTypeReference,
  TypeScriptStringLiteral,
  TypeScriptTypeUsage,
  TypeScriptUnion,
  TypeScriptValue,
} from '@graphql-codegen/visitor-plugin-common';
import { GraphQLInterfaceType, GraphQLObjectType } from 'graphql';

export class TypeScriptSelectionSetProcessor extends BaseSelectionSetProcessor<SelectionSetProcessorConfig> {
  transformPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveField[],
    unsetTypes?: boolean
  ): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    const parentName =
      (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
      this.config.convertName(schemaType.name, {
        useTypesPrefix: true,
      });

    if (unsetTypes) {
      return [
        new TypeScriptTypeUsage({
          typeReference: new TypeScriptRawTypeReference('MakeEmpty'),
          typeArguments: [
            new TypeScriptRawTypeReference(parentName),
            new TypeScriptUnion({
              members: fields.map(field => new TypeScriptStringLiteral({ literal: field.fieldName })),
            }),
          ],
        }),
      ];
    }

    let hasConditionals = false;
    const conditionalsList: string[] = [];

    let res = new TypeScriptTypeUsage({
      typeReference: new TypeScriptRawTypeReference('Pick'),
      typeArguments: [
        new TypeScriptRawTypeReference(parentName),
        new TypeScriptUnion({
          members: fields.map(field => {
            if (field.isConditional) {
              hasConditionals = true;
              conditionalsList.push(field.fieldName);
            }
            return new TypeScriptStringLiteral({ literal: field.fieldName });
          }),
        }),
      ],
    });

    if (hasConditionals) {
      const avoidOptional =
        // TODO: check type and exec only if relevant
        this.config.avoidOptionals === true ||
        (typeof this.config.avoidOptionals === 'object' &&
          (this.config.avoidOptionals.field ||
            this.config.avoidOptionals.inputValue ||
            this.config.avoidOptionals.object));

      const transform = avoidOptional ? 'MakeMaybe' : 'MakeOptional';

      res = new TypeScriptTypeUsage({
        typeReference: new TypeScriptRawTypeReference(
          `${this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : ''}${transform}`
        ),
        typeArguments: [
          res,
          new TypeScriptUnion({
            members: conditionalsList.map(field => new TypeScriptStringLiteral({ literal: field })),
          }),
        ],
      });
    }
    return [res];
  }

  transformTypenameField(type: TypeScriptValue, nameConfig: FieldNameConfig): ProcessResult {
    return [
      new TypeScriptObject({
        properties: [
          new TypeNameProperty({
            ...nameConfig,
            value: type,
          }),
        ],
      }),
    ];
  }

  transformAliasesPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveAliasedFields[]
  ): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    const parentName =
      (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
      this.config.convertName(schemaType.name, {
        useTypesPrefix: true,
      });

    return [
      new TypeScriptObject({
        properties: fields.map(aliasedField => {
          const value =
            aliasedField.fieldName === '__typename'
              ? new TypeScriptStringLiteral({ literal: schemaType.name })
              : new TypeScriptTypeUsage({
                  typeReference: new TypeScriptRawTypeReference(parentName),
                  propertyPath: [new TypeScriptStringLiteral({ literal: aliasedField.fieldName })],
                });
          return new TypeScriptObjectProperty({ propertyName: aliasedField.alias, value });
        }),
      }),
    ];
  }

  transformLinkFields(fields: LinkField[]): ProcessResult {
    if (fields.length === 0) {
      return [];
    }

    return [
      new TypeScriptObject({
        properties: fields.map(
          field =>
            new TypeScriptObjectProperty({
              ...(field.alias || field.name),
              value: field.selectionSet,
            })
        ),
      }),
    ];
  }
}
