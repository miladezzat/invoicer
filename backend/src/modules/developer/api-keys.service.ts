import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey, ApiKeyDocument } from '../../schemas/api-key.schema';

export interface CreateApiKeyDto {
  name: string;
  permissions?: string[];
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key?: string; // Only returned on creation
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  usageCount: number;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  /**
   * Generate a new API key
   */
  async createApiKey(
    userId: string,
    createDto: CreateApiKeyDto,
  ): Promise<ApiKeyResponse> {
    // Generate random API key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const prefix = 'inv_' + crypto.randomBytes(4).toString('hex');
    const fullKey = `${prefix}_${randomBytes}`;

    // Hash the key for storage
    const hashedKey = await bcrypt.hash(fullKey, 10);

    const apiKey = new this.apiKeyModel({
      userId: new Types.ObjectId(userId),
      name: createDto.name,
      prefix,
      hashedKey,
      permissions: createDto.permissions || ['read', 'write'],
      expiresAt: createDto.expiresAt,
      isActive: true,
      usageCount: 0,
    });

    await apiKey.save();

    this.logger.log(`Created API key for user ${userId}: ${apiKey.name}`);

    // Return the full key only once
    return {
      id: (apiKey._id as any).toString(),
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: fullKey, // Only returned here
      permissions: apiKey.permissions,
      isActive: apiKey.isActive,
      usageCount: apiKey.usageCount,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt!,
    };
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.apiKeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return apiKeys.map((key) => ({
      id: (key._id as any).toString(),
      name: key.name,
      prefix: key.prefix,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt!,
    }));
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const result = await this.apiKeyModel
      .deleteOne({
        _id: new Types.ObjectId(keyId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('API key not found');
    }

    this.logger.log(`Deleted API key ${keyId} for user ${userId}`);
  }

  /**
   * Toggle API key active status
   */
  async toggleApiKey(userId: string, keyId: string, isActive: boolean): Promise<void> {
    const result = await this.apiKeyModel
      .updateOne(
        {
          _id: new Types.ObjectId(keyId),
          userId: new Types.ObjectId(userId),
        },
        { $set: { isActive } },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException('API key not found');
    }

    this.logger.log(`Toggled API key ${keyId} to ${isActive} for user ${userId}`);
  }

  /**
   * Validate API key and return user ID
   * Used by API authentication guard
   */
  async validateApiKey(apiKey: string, clientIp?: string): Promise<string | null> {
    const result = await this.validateApiKeyWithDetails(apiKey, clientIp);
    return result ? result.userId : null;
  }

  /**
   * Validate API key and return user ID and API key document
   * Used by API authentication guard to attach API key info to request
   */
  async validateApiKeyWithDetails(
    apiKey: string,
    clientIp?: string,
  ): Promise<{ userId: string; apiKeyDoc: ApiKeyDocument } | null> {
    if (!apiKey || !apiKey.startsWith('inv_')) {
      return null;
    }

    // Extract prefix
    const parts = apiKey.split('_');
    if (parts.length < 3) {
      return null;
    }
    const prefix = `${parts[0]}_${parts[1]}`;

    // Find key by prefix
    const keys = await this.apiKeyModel
      .find({ prefix, isActive: true })
      .exec();

    // Check each key with matching prefix
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.hashedKey);
      
      if (isValid) {
        // Check expiration
        if (key.expiresAt && key.expiresAt < new Date()) {
          this.logger.warn(`Expired API key used: ${key._id}`);
          return null;
        }

        // Check IP whitelist if configured
        if (key.ipWhitelist && key.ipWhitelist.length > 0 && clientIp) {
          const isIpAllowed = key.ipWhitelist.includes(clientIp);
          if (!isIpAllowed) {
            this.logger.warn(`API key ${key._id} used from unauthorized IP: ${clientIp}`);
            return null;
          }
        }

        // Update usage stats
        await this.apiKeyModel.updateOne(
          { _id: key._id },
          {
            $set: { lastUsedAt: new Date() },
            $inc: { usageCount: 1 },
          },
        ).exec();

        return {
          userId: key.userId.toString(),
          apiKeyDoc: key,
        };
      }
    }

    return null;
  }

  /**
   * Get API key statistics
   */
  async getStats(userId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsage: number;
  }> {
    const keys = await this.apiKeyModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
    };
  }
}

