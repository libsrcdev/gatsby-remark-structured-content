import type { PluginOptionsSchemaArgs } from "gatsby";

export function pluginOptionsSchema(
  { Joi }: PluginOptionsSchemaArgs
) {
  return Joi.object({});
}
