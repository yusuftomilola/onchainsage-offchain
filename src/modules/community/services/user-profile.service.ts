import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../user/entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['posts', 'comments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateProfileDto.username && updateProfileDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateProfileDto.username },
      });
      if (existingUser) {
        throw new ConflictException('Username already taken');
      }
    }

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already taken');
      }
    }

    Object.assign(user, updateProfileDto);
    return this.userRepository.save(user);
  }

  async getUserStats(userId: string): Promise<{
    postsCount: number;
    commentsCount: number;
    totalUpvotes: number;
    totalDownvotes: number;
    reputation: number;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['posts', 'comments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const postsCount = user.posts?.length || 0;
    const commentsCount = user.comments?.length || 0;
    
    const totalUpvotes = (user.posts || []).reduce((sum, post) => sum + (post.upvotes ?? 0), 0) +
                        (user.comments || []).reduce((sum, comment) => sum + (comment.upvotes ?? 0), 0);
    
    const totalDownvotes = (user.posts || []).reduce((sum, post) => sum + (post.downvotes ?? 0), 0) +
                          (user.comments || []).reduce((sum, comment) => sum + (comment.downvotes ?? 0), 0);

    return {
      postsCount,
      commentsCount,
      totalUpvotes,
      totalDownvotes,
      reputation: user.reputation ?? 0,
    };
  }
}
