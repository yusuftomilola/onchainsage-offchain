import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UserProfileService } from '../services/user-profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Controller('users')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('profile')
  async getMyProfile(@Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.userProfileService.getProfile(userId);
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    return this.userProfileService.getProfile(id);
  }

  @Patch('profile')
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.userProfileService.updateProfile(userId, updateProfileDto);
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    return this.userProfileService.getUserStats(id);
  }
}
