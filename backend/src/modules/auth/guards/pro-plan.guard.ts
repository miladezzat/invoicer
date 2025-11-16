import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';

@Injectable()
export class ProPlanGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const isPro = user.plan?.tier === 'pro' && 
                  user.subscription?.status &&
                  ['active', 'trialing'].includes(user.subscription.status);

    if (!isPro) {
      throw new ForbiddenException('Pro plan required for this feature');
    }

    return true;
  }
}

