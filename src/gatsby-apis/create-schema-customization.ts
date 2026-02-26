import type { CreateSchemaCustomizationArgs } from 'gatsby';
import type { RemarkStructuredContentPluginOptions } from '../utils/types.js';

export async function createSchemaCustomization(
  gatsbyNodeApis: CreateSchemaCustomizationArgs,
  pluginOptions: RemarkStructuredContentPluginOptions
): Promise<void> {
  const { reporter } = gatsbyNodeApis;

  reporter.info(`[remark-structured-content] createSchemaCustomization called`);

  // Collect transformer schema customization fns
  const callbacks = pluginOptions.transformers
    ?.map((t) => t.createSchemaCustomization)
    .filter((fn): fn is NonNullable<typeof fn> => Boolean(fn));

  if (callbacks && callbacks.length > 0) {
    reporter.verbose(
      `[remark-structured-content] Running ${callbacks.length} transformer schema customization callback(s)`
    );
    for (const callback of callbacks) {
      // Allow each transformer to extend types
      await callback(gatsbyNodeApis, pluginOptions);
    }
    reporter.verbose(
      `[remark-structured-content] Schema customization callbacks complete`
    );
  } else {
    reporter.verbose(
      `[remark-structured-content] No transformer schema customization callbacks to run`
    );
  }
}
