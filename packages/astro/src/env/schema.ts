import { z } from 'zod';
import { PUBLIC_PREFIX } from './constants.js';

const StringSchema = z.object({
	type: z.literal('string'),
	optional: z.boolean().optional(),
	default: z.string().optional(),
});
const NumberSchema = z.object({
	type: z.literal('number'),
	optional: z.boolean().optional(),
	default: z.number().optional(),
});
const BooleanSchema = z.object({
	type: z.literal('boolean'),
	optional: z.boolean().optional(),
	default: z.boolean().optional(),
});
const EnumSchema = z.object({
	type: z.literal('enum'),
	values: z.array(
		// We use "'" for codegen so it can't be passed here
		z.string().refine((v) => !v.includes("'"), {
			message: `The "'" character can't be used as an enum value`,
		})
	),
	optional: z.boolean().optional(),
	default: z.string().optional(),
});

const EnvFieldType = z.union([
	StringSchema,
	NumberSchema,
	BooleanSchema,
	EnumSchema.superRefine((schema, ctx) => {
		if (schema.default) {
			if (!schema.values.includes(schema.default)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `The default value "${
						schema.default
					}" must be one of the specified values: ${schema.values.join(', ')}.`,
				});
			}
		}
	}),
]);
export type EnvFieldType = z.infer<typeof EnvFieldType>;

const PublicClientEnvFieldMetadata = z.object({
	context: z.literal('client'),
	access: z.literal('public'),
});
const PublicServerEnvFieldMetadata = z.object({
	context: z.literal('server'),
	access: z.literal('public'),
});
const SecretServerEnvFieldMetadata = z.object({
	context: z.literal('server'),
	access: z.literal('secret'),
});
const EnvFieldMetadata = z.union([
	PublicClientEnvFieldMetadata,
	PublicServerEnvFieldMetadata,
	SecretServerEnvFieldMetadata,
]);

const KEY_REGEX = /^[A-Z_]+$/;

export const EnvSchema = z
	.record(
		z.string().regex(KEY_REGEX, {
			message: 'A valid variable name can only contain uppercase letters and underscores.',
		}),
		z.intersection(EnvFieldMetadata, EnvFieldType)
	)
	.superRefine((schema, ctx) => {
		for (const [key, value] of Object.entries(schema)) {
			if (key.startsWith(PUBLIC_PREFIX) && value.access !== 'public') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `An environment variable whose name is prefixed by "${PUBLIC_PREFIX}" must be public.`,
				});
			}
			if (value.access === 'public' && !key.startsWith(PUBLIC_PREFIX)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `An environment variable that is public must have a name prefixed by "${PUBLIC_PREFIX}".`,
				});
			}
		}
	});

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type EnvSchema = z.infer<typeof EnvSchema>;

type _Field<T extends z.ZodType> = Prettify<z.infer<typeof EnvFieldMetadata & T>>;
type _FieldInput<T extends z.ZodType, TKey extends string = 'type'> = Prettify<
	z.infer<typeof EnvFieldMetadata> & Omit<z.infer<T>, TKey>
>;

export type StringField = _Field<typeof StringSchema>;
export type StringFieldInput = _FieldInput<typeof StringSchema>;

export type NumberField = _Field<typeof NumberSchema>;
export type NumberFieldInput = _FieldInput<typeof NumberSchema>;

export type BooleanField = _Field<typeof BooleanSchema>;
export type BooleanFieldInput = _FieldInput<typeof BooleanSchema>;

export type EnumField = _Field<typeof EnumSchema>;
export type EnumFieldInput<T extends string> = Prettify<
	_FieldInput<typeof EnumSchema, 'type' | 'values' | 'default'> & {
		values: Array<T>;
		default?: NoInfer<T> | undefined;
	}
>;
