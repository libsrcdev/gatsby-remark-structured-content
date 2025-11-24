import type { PluginOptionsSchemaArgs } from "gatsby";

export default function pluginOptionsSchema(
  { Joi }: PluginOptionsSchemaArgs
) {
  return Joi.object({});
}
