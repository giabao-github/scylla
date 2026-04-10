"use node";

import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
  PutSecretValueCommand,
  ResourceExistsException,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { ConvexError } from "convex/values";

export const createSecretsManagerClient = (): SecretsManagerClient => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new ConvexError({
      code: "MISSING_AWS_ENV_VARS",
      message:
        "Missing required AWS environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
    });
  }

  return new SecretsManagerClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export const getSecretValue = async (
  secretName: string,
): Promise<GetSecretValueCommandOutput> => {
  const client = createSecretsManagerClient();
  return await client.send(new GetSecretValueCommand({ SecretId: secretName }));
};

export const upsertSecretValue = async (
  secretName: string,
  secretValue: Record<string, unknown>,
): Promise<void> => {
  const client = createSecretsManagerClient();
  const secretString = JSON.stringify(secretValue);

  try {
    await client.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: secretString,
      }),
    );
  } catch (error) {
    if (
      error instanceof ResourceExistsException ||
      (error instanceof Error && error.name === "ResourceExistsException")
    ) {
      await client.send(
        new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: secretString,
        }),
      );
    } else if (error instanceof Error && error.name === "ValidationException") {
      throw new ConvexError({
        code: "INVALID_SECRET_VALUE",
        message: `Invalid secret name or value: ${error.message}`,
      });
    } else if (
      error instanceof Error &&
      error.name === "ResourceNotFoundException"
    ) {
      throw new ConvexError({
        code: "RESOURCE_NOT_FOUND",
        message: `Resource not found while creating secret "${secretName}": ${error.message}`,
      });
    } else {
      throw error;
    }
  }
};

export const parseSecretString = <T = Record<string, unknown>>(
  secret: GetSecretValueCommandOutput,
): T | null => {
  if (!secret.SecretString) return null;
  try {
    return JSON.parse(secret.SecretString) as T;
  } catch (error) {
    console.error("Failed to parse secret string:", error);
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Failed to parse secret string as JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
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
