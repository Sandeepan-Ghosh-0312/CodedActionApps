## Section using images/docs
Whenever you are using an asset in the app with src like image or document, shift it to assets folder under the root folder and import the asset into the file where it is used from the assets folder and wrap it in this function export function resolveAssetUrl(assetPath: string): string {
  const scripts = document.getElementsByTagName('script');
  let imageBaseUrl = '';
  for (const script of scripts) {
    if (script.src && script.src.includes('/assets/') && script.src.includes('.js')) {
      const assetsIndex = script.src.indexOf('/assets/');
      imageBaseUrl = script.src.substring(0, assetsIndex);
      break;
    }
  }
  console.log('resolved url', ${imageBaseUrl}${assetPath});
  return ${imageBaseUrl}${assetPath};
}

## Section Action Schema contract
Contract for creating action-schema.json
{                                                                                                                    │
│   "$schema": "http://json-schema.org/draft-07/schema#",                                                              │
│   "$id": "https://uipath.com/schemas/action-schema.json",                                                            │
│   "title": "UiPath Action Schema",                                                                                   │
│   "description": "Schema for defining UiPath action inputs, outputs, inOuts, and outcomes",                          │
│   "type": "object",                                                                                                  │
│   "required": ["inputs", "outputs", "inOuts", "outcomes"],                                                           │
│   "properties": {                                                                                                    │
│     "inputs": {                                                                                                      │
│       "$ref": "#/definitions/schemaObject",                                                                          │
│       "description": "Input parameters for the action"                                                               │
│     },                                                                                                               │
│     "outputs": {                                                                                                     │
│       "$ref": "#/definitions/schemaObject",                                                                          │
│       "description": "Output parameters from the action"                                                             │
│     },                                                                                                               │
│     "inOuts": {                                                                                                      │
│       "$ref": "#/definitions/schemaObject",                                                                          │
│       "description": "Parameters that serve as both input and output"                                                │
│     },                                                                                                               │
│     "outcomes": {                                                                                                    │
│       "$ref": "#/definitions/schemaObject",                                                                          │
│       "description": "Possible outcomes/results of the action"                                                       │
│     }                                                                                                                │
│   },                                                                                                                 │
│   "additionalProperties": false,                                                                                     │
│   "definitions": {                                                                                                   │
│     "schemaObject": {                                                                                                │
│       "type": "object",                                                                                              │
│       "required": ["type", "properties"],                                                                            │
│       "properties": {                                                                                                │
│         "type": {                                                                                                    │
│           "type": "string",                                                                                          │
│           "const": "object",                                                                                         │
│           "description": "Must be 'object'"                                                                          │
│         },                                                                                                           │
│         "properties": {                                                                                              │
│           "type": "object",                                                                                          │
│           "patternProperties": {                                                                                     │
│             "^.$": {                                                                                                │
│               "$ref": "#/definitions/schemaProperty"                                                                 │
│             }                                                                                                        │
│           },                                                                                                         │
│           "additionalProperties": false                                                                              │
│         }                                                                                                            │
│       },                                                                                                             │
│       "additionalProperties": false                                                                                  │
│     },                                                                                                               │
│     "schemaProperty": {                                                                                              │
│       "type": "object",                                                                                              │
│       "required": ["type"],                                                                                          │
│       "properties": {                                                                                                │
│         "type": {                                                                                                    │
│           "type": "string",                                                                                          │
│           "enum": ["string", "integer", "number", "boolean", "array", "object"],                                     │
│           "description": "The data type of the property"                                                             │
│         },                                                                                                           │
│         "required": {                                                                                                │
│           "type": "boolean",                                                                                         │
│           "description": "Whether this property is required"                                                         │
│         },                                                                                                           │
│         "description": {                                                                                             │
│           "type": "string",                                                                                          │
│           "description": "Human-readable description of the property"                                                │
│         },                                                                                                           │
│         "format": {                                                                                                  │
│           "type": "string",                                                                                          │
│           "enum": ["uuid", "date"],                                                                                  │
│           "description": "Additional format constraint for the property"                                             │
│         },                                                                                                           │
│         "items": {                                                                                                   │
│           "$ref": "#/definitions/arrayItems",                                                                        │
│           "description": "Schema for array items (required when type is 'array')"                                    │
│         },                                                                                                           │
│         "properties": {                                                                                              │
│           "type": "object",                                                                                          │
│           "patternProperties": {                                                                                     │
│             "^.$": {                                                                                                │
│               "$ref": "#/definitions/schemaProperty"                                                                 │
│             }                                                                                                        │
│           },                                                                                                         │
│           "description": "Nested properties for object types"                                                        │
│         }                                                                                                            │
│       },                                                                                                             │
│       "additionalProperties": false,                                                                                 │
│       "allOf": [                                                                                                     │
│         {                                                                                                            │
│           "if": {                                                                                                    │
│             "properties": {                                                                                          │
│               "type": {                                                                                              │
│                 "const": "array"                                                                                     │
│               }                                                                                                      │
│             }                                                                                                        │
│           },                                                                                                         │
│           "then": {                                                                                                  │
│             "required": ["items"],                                                                                   │
│             "errorMessage": "Array properties must have an 'items' field"                                            │
│           }                                                                                                          │
│         }                                                                                                            │
│       ]                                                                                                              │
│     },                                                                                                               │
│     "arrayItems": {                                                                                                  │
│       "type": "object",                                                                                              │
│       "required": ["type"],                                                                                          │
│       "properties": {                                                                                                │
│         "type": {                                                                                                    │
│           "type": "string",                                                                                          │
│           "enum": ["string", "integer", "number", "boolean", "object"],                                              │
│           "description": "The data type of array items (array not allowed - nested arrays not supported)"            │
│         },                                                                                                           │
│         "required": {                                                                                                │
│           "type": "boolean",                                                                                         │
│           "description": "Whether array items are required"                                                          │
│         },                                                                                                           │
│         "description": {                                                                                             │
│           "type": "string",                                                                                          │
│           "description": "Description of array items"                                                                │
│         },                                                                                                           │
│         "format": {                                                                                                  │
│           "type": "string",                                                                                          │
│           "enum": ["uuid", "date"],                                                                                  │
│           "description": "Format constraint for array items"                                                         │
│         },                                                                                                           │
│         "properties": {                                                                                              │
│           "type": "object",                                                                                          │
│           "patternProperties": {                                                                                     │
│             "^.*$": {                                                                                                │
│               "$ref": "#/definitions/schemaProperty"                                                                 │
│             }                                                                                                        │
│           },                                                                                                         │
│           "description": "Nested properties when array items are objects"                                            │
│         }                                                                                                            │
│       },                                                                                                             │
│       "additionalProperties": false                                                                                  │
│     }                                                                                                                │
│   }                                                                                                                  │
│ }

## Section Action Center Initialization
When asked to add initialization code for Action Center, do the following
add "@uipath/uipath-typescript" in package.json dependencies with file uipath-uipath-typescript-1.0.0-dev-actionApp.1.tgz present in the current folder.
Then in the app, at the starting of the app, this code shoud execute this code block
[sdk.taskEvents.getTaskDetailsFromActionCenter((data: any) => {
      if (data.data) {
        setFormData(data.data);
      }
      if (data.baseUrl && data.orgName && data.tenantName && data.token) {
        initializeSdk({
          baseUrl: data.baseUrl,
          orgName: data.orgName,
          tenantName: data.tenantName,
          token: data.token
        });
      }
      if (data.newToken) {
        sdk.updateToken(data.newToken);
      }
    });
sdk.taskEvents.initializeInActionCenter();
]

create file uipath.ts in the root and add this code import { UiPath } from '@uipath/uipath-typescript';
// initial declaration for initilaization event in Action Center
let sdk = new UiPath({
  baseUrl: 'dummy',
  orgName: 'dummy',
  tenantName: 'dummy',
  secret: 'dummy',
});
/**

Initialize or reinitialize the SDK with runtime configuration
*/
export const initializeSdk = (config: {
baseUrl: string;
orgName: string;
tenantName: string;
token: string;
}): void => {
sdk = new UiPath({
 baseUrl: config.baseUrl,
 orgName: config.orgName,
 tenantName: config.tenantName,
 secret: config.token,
});
console.log('UiPath SDK initialized with runtime config');
};
export default sdk;
now when user changes the form data call function sdk.taskEvents.dataChanged(updatedData); and when the buttons are clicked call sdk.taskEvents.completeTask('Accept', formData); where 'Accept' here is the corresponding outcome defined in the schema