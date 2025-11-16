import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';

/**
 * Guard to authenticate requests using API keys
 * Checks for API key in Authorization header: Bearer inv_xxxxx
 * 
 * @example
 * ```typescript
 * @Get()
 * @UseGuards(ApiKeyAuthGuard)
 * async getData(@CurrentUser() user: User) {
 *   // user is populated from API key
 * }
 * ```
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract API key from Authorization header
    const authHeader = request.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required');
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    // Get client IP
    const clientIp = request.ip || request.connection.remoteAddress;

    // Validate API key and get key info
    const validationResult = await this.apiKeysService.validateApiKeyWithDetails(apiKey, clientIp);

    if (!validationResult) {
      this.logger.warn(`Invalid API key attempt from IP: ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    const { userId, apiKeyDoc } = validationResult;

    // Load user
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has API access feature
    if (user.plan?.tier !== 'pro') {
      throw new UnauthorizedException('API access requires Pro plan');
    }

    // Attach user and API key to request
    request.user = user;
    request.apiKey = apiKeyDoc;

    this.logger.debug(`API request authenticated for user ${userId}`);

    return true;
  }
}

