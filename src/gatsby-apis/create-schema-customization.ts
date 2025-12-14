import type { CreateSchemaCustomizationArgs } from "gatsby";
import type { RemarkStructuredContentTransformer } from "../utils/types.js";

interface StructuredContentPluginOptions {
  transformers?: RemarkStructuredContentTransformer[];
}

export async function createSchemaCustomization(
  gatsbyNodeApis: CreateSchemaCustomizationArgs,
  pluginOptions: StructuredContentPluginOptions,
): Promise<void> {
  const { actions, reporter } = gatsbyNodeApis;

  reporter.info("Starting createSchemaCustomization in remark-structured-content plugin");

  // const { createTypes } = actions;

  // const typeDefs = `
  //   type MarkdownRemark implements Node {
  //     structuredContent: [Node!] @link(by: "parent.id", from: "id")
  //   }
  // `;

  // createTypes(typeDefs);

  // Collect transformer schema customization fns
  const callbacks =
    pluginOptions.transformers
      ?.map((t) => t.createSchemaCustomization)
      .filter((fn): fn is NonNullable<typeof fn> => Boolean(fn));

  if (callbacks && callbacks.length > 0) {
    for (const callback of callbacks) {
      // Allow each transformer to extend types
      await callback({ ...gatsbyNodeApis });
    }
  }
}
