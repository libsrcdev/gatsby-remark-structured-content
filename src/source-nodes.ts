import type { SourceNodesArgs, PluginOptions } from "gatsby";
import { RemarkPluginApi } from "./types";

export default async function sourceNodes(
  gatsbyArgs: SourceNodesArgs,
  pluginOptions: RemarkPluginApi
): Promise<void> {
  const {
    actions: { createNode },
    createContentDigest,
    createNodeId,
    getNodesByType,
  } = gatsbyArgs;

  // ...
}
