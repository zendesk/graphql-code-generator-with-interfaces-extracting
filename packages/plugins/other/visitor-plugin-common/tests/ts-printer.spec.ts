import {
  TypeScriptPrimitiveString,
  TypeScriptPrimitiveNumber,
  TypeScriptPrimitiveBoolean,
  TypeScriptIntersection,
  TypeScriptUnion,
  TypeScriptPrinter,
  TypeScriptTypeAlias,
  TypeScriptInterface,
  TypeScriptObject,
  TypeScriptObjectProperty,
  TypeScriptEnum,
} from '../src/ts-printer';

describe('TypeScriptPrinter', () => {
  describe('intersection and union', () => {
    test('should correctly print TypeScriptIntersection', () => {
      const intersection = new TypeScriptIntersection({
        members: [TypeScriptPrimitiveString, TypeScriptPrimitiveNumber],
      });
      expect(intersection.print()).toBe('string & number');

      const complexIntersection = new TypeScriptIntersection({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptUnion({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(complexIntersection.print()).toBe('string & ( number | boolean )');
    });

    test('should correctly print TypeScriptUnion', () => {
      const union = new TypeScriptUnion({
        members: [TypeScriptPrimitiveString, TypeScriptPrimitiveNumber],
      });
      expect(union.print()).toBe('string | number');

      const complexUnion = new TypeScriptUnion({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptIntersection({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(complexUnion.print()).toBe('string | ( number & boolean )');
    });
    test('should correctly print optimized TypeScriptIntersection', () => {
      const optimizedIntersection = new TypeScriptIntersection({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptIntersection({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(optimizedIntersection.print()).toBe('string & number & boolean');

      const complexOptimizedIntersection = new TypeScriptIntersection({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptUnion({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(complexOptimizedIntersection.print()).toBe('string & ( number | boolean )');
    });

    test('should correctly print optimized TypeScriptUnion', () => {
      const optimizedUnion = new TypeScriptUnion({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptUnion({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(optimizedUnion.print()).toBe('string | number | boolean');

      const complexOptimizedUnion = new TypeScriptUnion({
        members: [
          TypeScriptPrimitiveString,
          new TypeScriptIntersection({
            members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
          }),
        ],
      });
      expect(complexOptimizedUnion.print()).toBe('string | ( number & boolean )');
    });
  });

  test('should correctly print TypeScriptPrimitive', () => {
    const primitive = TypeScriptPrimitiveString;
    expect(primitive.print()).toBe('string');
  });

  test('should correctly print TypeScriptObjectProperty', () => {
    const property = new TypeScriptObjectProperty({
      propertyName: 'prop',
      value: TypeScriptPrimitiveString,
    });
    expect(property.print()).toBe('prop: string');
  });

  test('should correctly print TypeScriptObject', () => {
    const object = new TypeScriptObject({
      properties: [
        new TypeScriptObjectProperty({
          propertyName: 'prop1',
          value: TypeScriptPrimitiveString,
        }),
        new TypeScriptObjectProperty({
          propertyName: 'prop2',
          value: TypeScriptPrimitiveNumber,
        }),
      ],
    });
    expect(object.print()).toBe('{\n  prop1: string,\n  prop2: number\n}');
  });

  test('should correctly print TypeScriptInterface', () => {
    const interfaceObj = new TypeScriptInterface({
      typeName: 'MyInterface',
      extends: [new TypeScriptInterface({ typeName: 'BaseInterface' })],
      definition: new TypeScriptObject({
        properties: [
          new TypeScriptObjectProperty({
            propertyName: 'prop',
            value: TypeScriptPrimitiveString,
          }),
        ],
      }),
      export: true,
    });
    expect(interfaceObj.print()).toBe('export interface MyInterface extends BaseInterface {\n  prop: string\n}');
  });

  test('should correctly print TypeScriptTypeAlias', () => {
    const typeAlias = new TypeScriptTypeAlias({
      typeName: 'MyType',
      target: TypeScriptPrimitiveString,
      export: true,
    });
    expect(typeAlias.print()).toBe('export type MyType = string');
  });

  test('should correctly print TypeScriptPrinter', () => {
    const printer = new TypeScriptPrinter({
      statements: [
        new TypeScriptTypeAlias({
          typeName: 'MyType',
          target: TypeScriptPrimitiveString,
          export: true,
        }),
        new TypeScriptInterface({
          typeName: 'MyInterface',
          extends: [new TypeScriptInterface({ typeName: 'BaseInterface' })],
          definition: new TypeScriptObject({
            properties: [
              new TypeScriptObjectProperty({
                propertyName: 'prop',
                value: TypeScriptPrimitiveString,
              }),
            ],
          }),
          export: true,
        }),
      ],
    });
    expect(printer.print()).toBe(
      'export type MyType = string\n\nexport interface MyInterface extends BaseInterface {\n  prop: string\n}'
    );
  });

  describe('formatting', () => {
    test('should correctly print complex example with multi-level indentation', () => {
      const complexType = new TypeScriptTypeAlias({
        typeName: 'ComplexType',
        target: new TypeScriptIntersection({
          members: [
            TypeScriptPrimitiveString,
            new TypeScriptUnion({
              members: [TypeScriptPrimitiveNumber, TypeScriptPrimitiveBoolean],
            }),
          ],
        }),
        export: true,
      });

      const complexInterface = new TypeScriptInterface({
        typeName: 'ComplexInterface',
        extends: [new TypeScriptInterface({ typeName: 'BaseInterface' })],
        definition: new TypeScriptObject({
          properties: [
            new TypeScriptObjectProperty({ propertyName: 'prop', value: complexType }),
            new TypeScriptObjectProperty({
              propertyName: 'nestedObject',
              value: new TypeScriptObject({
                properties: [
                  new TypeScriptObjectProperty({
                    propertyName: 'deepNestedObject',
                    value: new TypeScriptObject({
                      properties: [
                        new TypeScriptObjectProperty({ propertyName: 'deepProp', value: TypeScriptPrimitiveString }),
                      ],
                    }),
                  }),
                ],
              }),
            }),
          ],
        }),
        export: true,
      });

      const complexEnum = new TypeScriptEnum({
        typeName: 'ComplexEnum',
        entries: [{ name: 'A', value: '1' }, { name: 'B' }],
        export: true,
      });

      const printer = new TypeScriptPrinter({
        statements: [complexType, complexInterface, complexEnum],
      });

      const expectedOutput = `export type ComplexType = string & ( number | boolean )

export interface ComplexInterface extends BaseInterface {
  prop: ComplexType,
  nestedObject: {
    deepNestedObject: {
      deepProp: string
    }
  }
}

export enum ComplexEnum {
  A = 1,
  B
}`;

      expect(printer.print()).toBe(expectedOutput);
    });

    test('should correctly print comments', () => {
      const commentEnum = new TypeScriptEnum({
        typeName: 'CommentEnum',
        entries: [{ name: 'A', value: '1' }, { name: 'B' }],
        export: true,
      }).withComment('This is an enum\ncomment');

      const commentProperty = new TypeScriptObjectProperty({
        propertyName: 'commentProp',
        value: TypeScriptPrimitiveString,
      }).withComment('This is a property\ncomment');

      const commentPropertSingleLine = new TypeScriptObjectProperty({
        propertyName: 'commentProp2',
        value: TypeScriptPrimitiveString,
      }).withComment('This is another property in a single line');

      const commentInterface = new TypeScriptInterface({
        typeName: 'CommentInterface',
        extends: [new TypeScriptInterface({ typeName: 'BaseInterface' })],
        definition: new TypeScriptObject({
          properties: [commentProperty, commentPropertSingleLine],
        }),
        export: true,
      }).withComment('This is an interface\ncomment');

      const commentType = new TypeScriptTypeAlias({
        typeName: 'CommentType',
        target: TypeScriptPrimitiveString,
        export: true,
      }).withComment('This is a type alias\ncomment');

      const printer = new TypeScriptPrinter({
        statements: [commentType, commentInterface, commentEnum],
      });

      expect(printer.print()).toMatchInlineSnapshot(`
        "/**
         * This is a type alias
         * comment
         */
        export type CommentType = string

        /**
         * This is an interface
         * comment
         */
        export interface CommentInterface extends BaseInterface {
          /**
           * This is a property
           * comment
           */
          commentProp: string,
          /** This is another property in a single line */
          commentProp2: string
        }

        /**
         * This is an enum
         * comment
         */
        export enum CommentEnum {
          A = 1,
          B
        }"
      `);
    });

    test('should correctly print optimized TypeScriptIntersection', () => {
      const complexIntersection = new TypeScriptIntersection({
        members: [
          new TypeScriptObject({
            properties: [new TypeScriptObjectProperty({ propertyName: 'prop1', value: TypeScriptPrimitiveString })],
          }),
          new TypeScriptIntersection({
            members: [
              new TypeScriptObject({
                properties: [new TypeScriptObjectProperty({ propertyName: 'prop2', value: TypeScriptPrimitiveNumber })],
              }),
              new TypeScriptObject({
                properties: [
                  new TypeScriptObjectProperty({ propertyName: 'prop3', value: TypeScriptPrimitiveBoolean }),
                ],
              }),
            ],
          }),
        ],
      });

      expect(complexIntersection.print()).toBe('{\n  prop1: string,\n  prop2: number,\n  prop3: boolean\n}');
    });

    test('should correctly print complex TypeScriptIntersection with conflicting properties', () => {
      const complexIntersection = new TypeScriptIntersection({
        members: [
          new TypeScriptObject({
            properties: [
              new TypeScriptObjectProperty({ propertyName: 'prop1', value: TypeScriptPrimitiveString }),
              new TypeScriptObjectProperty({ propertyName: 'conflict', value: TypeScriptPrimitiveString }),
            ],
          }),
          new TypeScriptIntersection({
            members: [
              new TypeScriptObject({
                properties: [
                  new TypeScriptObjectProperty({ propertyName: 'prop2', value: TypeScriptPrimitiveNumber }),
                  new TypeScriptObjectProperty({ propertyName: 'conflict', value: TypeScriptPrimitiveNumber }),
                ],
              }),
              new TypeScriptObject({
                properties: [
                  new TypeScriptObjectProperty({ propertyName: 'prop3', value: TypeScriptPrimitiveBoolean }),
                ],
              }),
            ],
          }),
          new TypeScriptIntersection({
            members: [
              new TypeScriptObject({
                properties: [
                  new TypeScriptObjectProperty({ propertyName: 'prop4', value: TypeScriptPrimitiveBoolean }),
                  new TypeScriptObjectProperty({ propertyName: 'conflict', value: TypeScriptPrimitiveBoolean }),
                ],
              }),
            ],
          }),
        ],
      });

      expect(complexIntersection.print()).toBe(
        `{
  prop1: string,
  conflict: string & number & boolean,
  prop2: number,
  prop3: boolean,
  prop4: boolean
}`
      );
    });
  });
});
