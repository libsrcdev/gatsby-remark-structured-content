import type { SourceNodesArgs, PluginOptions } from "gatsby";
import { RemarkPluginApi } from "../utils/types";

export async function sourceNodes(
  gatsbyArgs: SourceNodesArgs,
  pluginOptions: RemarkPluginApi
): Promise<void> {
  const {
    actions: { createNode },
    createContentDigest,
    createNodeId,
    getNodesByType,
    reporter
  } = gatsbyArgs;

  reporter.verbose(`[remark-structured-content] sourceNodes called`);
}
