import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.usersService.findById(user._id);
    
    if (!fullUser) {
      throw new Error('User not found');
    }
    
    return {
      user: {
        id: fullUser._id,
        email: fullUser.email,
        name: fullUser.name,
        avatarUrl: fullUser.avatarUrl,
        plan: fullUser.plan,
        subscription: fullUser.subscription,
        settings: fullUser.settings,
      },
    };
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(user._id, updateUserDto);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return {
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
        plan: updatedUser.plan,
        subscription: updatedUser.subscription,
        settings: updatedUser.settings,
      },
    };
  }
}

