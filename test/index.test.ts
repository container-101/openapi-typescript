import fs from "node:fs";
import { OpenAPI3 } from "../src/types";
import openapiTS from "../dist/index.js";

const BOILERPLATE = `/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

`;

const ONE_OF_TYPE_HELPERS = `
/** OneOf type helpers */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
type OneOf<T extends any[]> = T extends [infer Only] ? Only : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]> : never;
`;

const WITH_REQUIRED_TYPE_HELPERS = `
/** WithRequired type helpers */
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
`;

beforeAll(() => {
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw new Error(`Process exited with error code ${code}`);
  }) as any);
});

describe("openapiTS", () => {
  beforeAll(() => {
    vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
  });

  describe("3.0", () => {
    test("custom properties", async () => {
      const generated = await openapiTS({
        openapi: "3.0",
        info: { title: "Test", version: "1.0" },
        components: {
          schemas: {
            Base: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            SchemaType: {
              oneOf: [{ $ref: "#/components/schemas/Base" }, { $ref: "#/x-swagger-bake/components/schemas/Extension" }],
            },
          },
        },
      });
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    Base: {
      [key: string]: string | undefined;
    };
    SchemaType: components["schemas"]["Base"];
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
    });

    test("components.examples are skipped", async () => {
      const generated = await openapiTS({
        openapi: "3.0",
        info: { title: "Test", version: "1.0" },
        components: {
          schemas: {
            Example: {
              type: "object",
              properties: {
                name: { type: "string" },
                $ref: { type: "string" },
              },
              required: ["name", "$ref"],
            },
          },
          examples: {
            Example: {
              value: {
                name: "Test",
                $ref: "fake.yml#/components/schemas/Example",
              },
            },
          },
        },
      });
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    Example: {
      name: string;
      $ref: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
    });

    test("parameter $refs", async () => {
      const generated = await openapiTS(new URL("./fixtures/parameters-test.yaml", import.meta.url));
      expect(generated).toBe(`${BOILERPLATE}
export interface paths {
  "/endpoint": {
    /** @description OK */
    get: {
      parameters: {
        path: {
          /** @description This overrides parameters */
          local_param_a: number;
          local_ref_a: components["parameters"]["local_ref_a"];
          remote_ref_a: external["_parameters-test-partial.yaml"]["remote_ref_a"];
          local_ref_b: components["parameters"]["local_ref_b"];
          remote_ref_b: external["_parameters-test-partial.yaml"]["remote_ref_b"];
        };
      };
    };
    parameters: {
      path: {
        local_param_a: string;
        local_ref_a: components["parameters"]["local_ref_a"];
        remote_ref_a: external["_parameters-test-partial.yaml"]["remote_ref_a"];
      };
    };
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: never;
  responses: never;
  parameters: {
    local_ref_a: string;
    local_ref_b: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export interface external {
  "_parameters-test-partial.yaml": {
    remote_ref_a: string;
    remote_ref_b: string;
  };
}

export type operations = Record<string, never>;
`);
    });
  });

  describe("3.1", () => {
    test("discriminator (allOf)", async () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "test", version: "1.0" },
        components: {
          schemas: {
            Pet: {
              type: "object",
              required: ["petType"],
              properties: { petType: { type: "string" } },
              discriminator: {
                propertyName: "petType",
                mapping: { dog: "Dog" },
              },
            },
            Cat: {
              allOf: [
                { $ref: "#/components/schemas/Pet" },
                {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              ],
            },
            Dog: {
              allOf: [
                { $ref: "#/components/schemas/Pet" },
                {
                  type: "object",
                  properties: { bark: { type: "string" } },
                },
              ],
            },
            Lizard: {
              allOf: [
                { $ref: "#/components/schemas/Pet" },
                {
                  type: "object",
                  properties: { lovesRocks: { type: "boolean" } },
                },
              ],
            },
          },
        },
      };
      const generated = await openapiTS(schema);
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    Pet: {
      petType: string;
    };
    Cat: {
      petType: "Cat";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      name?: string;
    };
    Dog: {
      petType: "dog";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      bark?: string;
    };
    Lizard: {
      petType: "Lizard";
    } & Omit<components["schemas"]["Pet"], "petType"> & {
      lovesRocks?: boolean;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
    });

    test("discriminator (oneOf)", async () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "test", version: "1.0" },
        components: {
          schemas: {
            Pet: {
              oneOf: [
                { $ref: "#/components/schemas/Cat" },
                { $ref: "#/components/schemas/Dog" },
                { $ref: "#/components/schemas/Lizard" },
              ],
              discriminator: {
                propertyName: "petType",
                mapping: {
                  cat: "#/components/schemas/Cat",
                  dog: "#/components/schemas/Dog",
                  lizard: "#/components/schemas/Lizard",
                },
              },
            },
            Cat: {
              type: "object",
              properties: {
                name: { type: "string" },
                petType: { type: "string", enum: ["cat"] },
              },
              required: ["petType"],
            },
            Dog: {
              type: "object",
              properties: {
                bark: { type: "string" },
                petType: { type: "string", enum: ["dog"] },
              },
              required: ["petType"],
            },
            Lizard: {
              type: "object",
              properties: {
                lovesRocks: { type: "boolean" },
                petType: { type: "string", enum: ["lizard"] },
              },
              required: ["petType"],
            },
          },
        },
      };
      const generated = await openapiTS(schema);
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    Pet: components["schemas"]["Cat"] | components["schemas"]["Dog"] | components["schemas"]["Lizard"];
    Cat: {
      name?: string;
      /** @enum {string} */
      petType: "cat";
    };
    Dog: {
      bark?: string;
      /** @enum {string} */
      petType: "dog";
    };
    Lizard: {
      lovesRocks?: boolean;
      /** @enum {string} */
      petType: "lizard";
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
    });

    test("$ref properties", async () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "Test", version: "1.0" },
        components: {
          schemas: {
            ObjRef: {
              type: "object",
              properties: {
                base: { $ref: "#/components/schemas/Entity/properties/foo" },
              },
            },
            AllOf: {
              allOf: [
                { $ref: "#/components/schemas/Entity/properties/foo" },
                { $ref: "#/components/schemas/Thingy/properties/bar" },
              ],
            },
          },
        },
      };
      const generated = await openapiTS(schema);
      expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    ObjRef: {
      base?: components["schemas"]["Entity"]["foo"];
    };
    AllOf: components["schemas"]["Entity"]["foo"] & components["schemas"]["Thingy"]["bar"];
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
    });
  });

  describe("options", () => {
    describe("exportTypes", () => {
      test("false", async () => {
        const generated = await openapiTS(
          {
            openapi: "3.1",
            info: { title: "Test", version: "1.0" },
            components: {
              schemas: {
                User: {
                  type: "object",
                  properties: { name: { type: "string" }, email: { type: "string" } },
                  required: ["name", "email"],
                },
              },
            },
          },
          { exportType: false }
        );
        expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    User: {
      name: string;
      email: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });

      test("true", async () => {
        const generated = await openapiTS(
          {
            openapi: "3.1",
            info: { title: "Test", version: "1.0" },
            components: {
              schemas: {
                User: {
                  type: "object",
                  properties: { name: { type: "string" }, email: { type: "string" } },
                  required: ["name", "email"],
                },
              },
            },
          },
          { exportType: true }
        );
        expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export type components = {
  schemas: {
    User: {
      name: string;
      email: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
};

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });
    });

    describe("pathParamsAsTypes", () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "Test", version: "1.0" },
        paths: {
          "/user/{user_id}": {
            parameters: [{ name: "user_id", in: "path" }],
          },
        },
      };

      test("false", async () => {
        const generated = await openapiTS(schema, { pathParamsAsTypes: false });
        expect(generated).toBe(`${BOILERPLATE}
export interface paths {
  "/user/{user_id}": {
    parameters: {
      path: {
        user_id: string;
      };
    };
  };
}

export type webhooks = Record<string, never>;

export type components = Record<string, never>;

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });

      test("true", async () => {
        const generated = await openapiTS(schema, { pathParamsAsTypes: true });
        expect(generated).toBe(`${BOILERPLATE}
export interface paths {
  [path: \`/user/\${string}\`]: {
    parameters: {
      path: {
        user_id: string;
      };
    };
  };
}

export type webhooks = Record<string, never>;

export type components = Record<string, never>;

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });
    });

    describe("transform/postTransform", () => {
      const schema: OpenAPI3 = {
        openapi: "3.1",
        info: { title: "Test", version: "1.0" },
        components: {
          schemas: {
            Date: { type: "string", format: "date-time" },
          },
        },
      };

      test("transform", async () => {
        const generated = await openapiTS(schema, {
          transform(node) {
            if ("format" in node && node.format === "date-time") return "Date";
          },
        });
        expect(generated).toBe(`${BOILERPLATE}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    /** Format: date-time */
    Date: Date;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });

      test("postTransform (with inject)", async () => {
        const inject = `type DateOrTime = Date | number;\n`;
        const generated = await openapiTS(schema, {
          postTransform(type, options) {
            if (options.path.includes("Date")) return "DateOrTime";
          },
          inject,
        });
        expect(generated).toBe(`${BOILERPLATE}
${inject}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    /** Format: date-time */
    Date: DateOrTime;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });
    });

    describe("OneOf type helpers", () => {
      test("should be added only when used", async () => {
        const generated = await openapiTS(
          {
            openapi: "3.1",
            info: { title: "Test", version: "1.0" },
            components: {
              schemas: {
                User: {
                  oneOf: [
                    {
                      type: "object",
                      properties: { firstName: { type: "string" } },
                    },
                    {
                      type: "object",
                      properties: { name: { type: "string" } },
                    },
                  ],
                },
              },
            },
          },
          { exportType: false }
        );
        expect(generated).toBe(`${BOILERPLATE}${ONE_OF_TYPE_HELPERS}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    User: OneOf<[{
      firstName?: string;
    }, {
      name?: string;
    }]>;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });
    });

    describe("WithRequired type helpers", () => {
      test("should be added only when used", async () => {
        const generated = await openapiTS(
          {
            openapi: "3.1",
            info: { title: "Test", version: "1.0" },
            components: {
              schemas: {
                User: {
                  allOf: [
                    {
                      type: "object",
                      properties: { firstName: { type: "string" }, lastName: { type: "string" } },
                    },
                    {
                      type: "object",
                      properties: { middleName: { type: "string" } },
                    },
                  ],
                  required: ["firstName", "lastName"],
                },
              },
            },
          },
          { exportType: false }
        );
        expect(generated).toBe(`${BOILERPLATE}${WITH_REQUIRED_TYPE_HELPERS}
export type paths = Record<string, never>;

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    User: WithRequired<{
      firstName?: string;
      lastName?: string;
    } & {
      middleName?: string;
    }, "firstName" | "lastName">;
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type external = Record<string, never>;

export type operations = Record<string, never>;
`);
      });
    });
  });

  // note: this tests the Node API; the snapshots in cli.test.ts test the CLI
  describe("snapshots", () => {
    const EXAMPLES_DIR = new URL("../examples/", import.meta.url);

    describe("GitHub", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./github-api.yaml", EXAMPLES_DIR));
        expect(generated).toBe(fs.readFileSync(new URL("./github-api.ts", EXAMPLES_DIR), "utf8"));
      }, 30000);
    });
    describe("GitHub (next)", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./github-api-next.yaml", EXAMPLES_DIR));
        expect(generated).toBe(fs.readFileSync(new URL("./github-api-next.ts", EXAMPLES_DIR), "utf8"));
      }, 30000);
    });
    describe("Octokit GHES 3.6 Diff to API", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./octokit-ghes-3.6-diff-to-api.json", EXAMPLES_DIR));
        expect(generated).toBe(fs.readFileSync(new URL("./octokit-ghes-3.6-diff-to-api.ts", EXAMPLES_DIR), "utf8"));
      }, 30000);
    });
    describe("Stripe", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./stripe-api.yaml", EXAMPLES_DIR));
        expect(generated).toBe(fs.readFileSync(new URL("./stripe-api.ts", EXAMPLES_DIR), "utf8"));
      }, 30000);
    });
    describe("DigitalOcean", () => {
      test("default options", async () => {
        const generated = await openapiTS(new URL("./digital-ocean-api/DigitalOcean-public.v2.yaml", EXAMPLES_DIR));
        expect(generated).toBe(fs.readFileSync(new URL("./digital-ocean-api.ts", EXAMPLES_DIR), "utf8"));
      }, 60000);
    });
  });
});
