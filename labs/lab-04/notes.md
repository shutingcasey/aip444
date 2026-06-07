# Structured Outputs

Structured Outputs force a language model to return data in a specific format.

Schemas define the shape and data types of valid output.

Using a schema makes LLM responses more reliable because the application can expect consistent field names and data types.

Zod is a TypeScript schema validation library.

In TypeScript, Zod can define the expected structure of data and validate it at runtime.

Structured Outputs help reduce parsing errors compared to using regular expressions to extract text from unstructured model responses.