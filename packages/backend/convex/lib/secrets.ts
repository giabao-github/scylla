"use node";

import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
  PutSecretValueCommand,
  ResourceExistsException,
  RestoreSecretCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { ConvexError } from "convex/values";
import z from "zod";

const handlePutSecretError = (secretName: string, error: unknown): never => {
  if (error instanceof Error && error.name === "ResourceNotFoundException") {
    throw new ConvexError({
      code: "RESOURCE_NOT_FOUND",
      message: `Secret "${secretName}" not found`,
    });
  }
  if (error instanceof Error && error.name === "ValidationException") {
    throw new ConvexError({
      code: "INVALID_SECRET_VALUE",
      message: `Invalid secret name or value: ${error.message}`,
    });
  }
  throw error;
};

export const createSecretsManagerClient = (): SecretsManagerClient => {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new ConvexError({
      code: "MISSING_AWS_REGION",
      message: "Missing required AWS environment variable: AWS_REGION",
    });
  }
  return new SecretsManagerClient({ region });
};

export const getSecretValue = async (
  secretName: string,
): Promise<GetSecretValueCommandOutput> => {
  const client = createSecretsManagerClient();
  try {
    return await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ResourceNotFoundException") {
      throw new ConvexError({
        code: "RESOURCE_NOT_FOUND",
        message: `Secret "${secretName}" not found`,
      });
    }
    throw error;
  }
};

export const upsertSecretValue = async (
  secretName: string,
  secretValue: Record<string, unknown>,
): Promise<void> => {
  const client = createSecretsManagerClient();
  const secretString = JSON.stringify(secretValue);

  try {
    await client.send(
      new CreateSecretCommand({ Name: secretName, SecretString: secretString }),
    );
  } catch (error) {
    if (
      error instanceof ResourceExistsException ||
      (error instanceof Error && error.name === "ResourceExistsException")
    ) {
      try {
        await client.send(
          new PutSecretValueCommand({
            SecretId: secretName,
            SecretString: secretString,
          }),
        );
      } catch (putError) {
        handlePutSecretError(secretName, putError);
      }
    } else if (
      error instanceof Error &&
      error.name === "InvalidRequestException" &&
      error.message.includes("scheduled for deletion")
    ) {
      await client.send(new RestoreSecretCommand({ SecretId: secretName }));
      try {
        await client.send(
          new PutSecretValueCommand({
            SecretId: secretName,
            SecretString: secretString,
          }),
        );
      } catch (restoreError) {
        handlePutSecretError(secretName, restoreError);
      }
    } else {
      handlePutSecretError(secretName, error);
    }
  }
};

export const deleteSecretValue = async (secretName: string): Promise<void> => {
  const client = createSecretsManagerClient();
  try {
    await client.send(
      new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: true,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ResourceNotFoundException") {
      return;
    }
    throw error;
  }
};

export const parseSecretString = <T>(
  secret: GetSecretValueCommandOutput,
  schema: z.ZodType<T>,
): T | null => {
  if (!secret.SecretString) return null;
  try {
    return schema.parse(JSON.parse(secret.SecretString));
  } catch (error) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Failed to parse secret string: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};
