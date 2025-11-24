import type { CreateNodeArgs, PluginOptions } from "gatsby";

interface StructuredContentPluginOptions extends PluginOptions {
  // add your plugin options here, e.g.:
  // transformers?: Transformer[];
}

export default async function onCreateNode(
  ...args: [CreateNodeArgs, StructuredContentPluginOptions]
): Promise<void> {
  const [
    {
      node,
      actions: { createNode, createNodeField, ...actions },
      createNodeId,
      getCache,
    },
    pluginOptions,
  ] = args;

  // your logic here, now fully typed
  // e.g.:
  // if (node.internal.type === "MarkdownRemark") { ... }
}
