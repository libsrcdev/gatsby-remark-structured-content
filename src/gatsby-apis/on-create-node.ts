import type { CreateNodeArgs, PluginOptions } from "gatsby";

interface StructuredContentPluginOptions extends PluginOptions {
  // add your plugin options here, e.g.:
  // transformers?: Transformer[];
}

export async function onCreateNode(
  ...args: [CreateNodeArgs, StructuredContentPluginOptions]
): Promise<void> {
  const [
    {
      node,
      actions: { createNode, createNodeField, ...actions },
      createNodeId,
      getCache,
      reporter,
    },
    pluginOptions,
  ] = args;

  reporter.verbose(`[remark-structured-content] onCreateNode called for node type: ${node.internal.type}`);
}
