import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './controller/community.controller';
import { CommunityService } from './services/community.service';
import { ForumController } from './controller/forum.controller';
import { ForumService } from './services/forum.service';
import { User } from '../../user/entities/user.entity';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Vote } from './entities/vote.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { CategoryController } from './controller/category.controller';
import { UserProfileController } from './controller/user-profile.controller';
import { CategoryService } from './services/category.service';
import { UserProfileService } from './services/user-profile.service';
import { NotificationModule } from '../notifications/notifications.module';

@Module({
    imports: [
    TypeOrmModule.forFeature([User, Post, Comment, Vote, Category, Tag]),
  ],
  controllers: [CommunityController, ForumController, CategoryController, UserProfileController],
  providers: [CommunityService, ForumService, CategoryService, UserProfileService, NotificationModule],
    exports: [ForumService, CategoryService, UserProfileService, NotificationModule],
})
export class CommunityModule {}
