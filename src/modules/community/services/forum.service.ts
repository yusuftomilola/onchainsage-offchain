import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';
import { Vote } from '../entities/vote.entity';
import { Category } from '../entities/category.entity';
import { Tag } from '../entities/tag.entity';
import { User } from '../entities/user.entity';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { VoteDto } from '../dto/vote.dto';
import { SearchDto } from '../dto/search.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';


@Injectable()
export class ForumService {
  NotificationGateway: any;
  NotificationService: any;
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: string): Promise<Post> {
    const { title, content, categoryId, tags } = createPostDto;

    const author = await this.userRepository.findOne({ where: { id: userId } });
    if (!author) {
      throw new NotFoundException('User not found');
    }

    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const postTags = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await this.tagRepository.findOne({ where: { name: tagName } });
        if (!tag) {
          tag = this.tagRepository.create({
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          });
          await this.tagRepository.save(tag);
        }
        postTags.push(tag);
      }
    }

    const post = this.postRepository.create({
      title,
      content,
      author,
      category,
      tags: postTags,
    });

    return this.postRepository.save(post);
  }

  async getPosts(page: number = 1, limit: number = 20, categoryId?: string): Promise<{ posts: Post[]; total: number }> {
    const queryBuilder = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.tags', 'tags')
      .where('post.isActive = :isActive', { isActive: true });

    if (categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    const total = await queryBuilder.getCount();
    const posts = await queryBuilder
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { posts, total };
  }

  async getPostById(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isActive: true },
      relations: ['author', 'category', 'tags', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postRepository.increment({ id }, 'views', 1);

    return post;
  }

  async updatePost(id: string, updatePostDto: UpdatePostDto, userId: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'tags'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.author || post.author.id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const { tags, categoryId, ...updateData } = updatePostDto;

    if (categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      post.category = category;
    }

    if (tags) {
      const postTags = [];
      for (const tagName of tags) {
        let tag = await this.tagRepository.findOne({ where: { name: tagName } });
        if (!tag) {
          tag = this.tagRepository.create({
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          });
          await this.tagRepository.save(tag);
        }
        postTags.push(tag);
      }
      post.tags = postTags;
    }

    Object.assign(post, updateData);
    return this.postRepository.save(post);
  }

  async deletePost(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.author || post.author.id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    post.isActive = false;
    await this.postRepository.save(post);
  }

  async createComment(createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
    const { content, postId, parentId } = createCommentDto;

    const author = await this.userRepository.findOne({ where: { id: userId } });
    if (!author) {
      throw new NotFoundException('User not found');
    }

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.isLocked) {
      throw new ForbiddenException('Cannot comment on locked post');
    }

    let parent = null;
    if (parentId) {
      parent = await this.commentRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = this.commentRepository.create({
      content,
      author,
      post,
      ...(parent ? { parent } : {}),
    });

    return await this.commentRepository.save(comment);
  }

  async getCommentsForPost(postId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { post: { id: postId }, isActive: true },
      relations: ['author', 'children', 'children.author'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateComment(id: string, content: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!comment.author || comment.author.id !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    comment.content = content;
    return this.commentRepository.save(comment);
  }

  async deleteComment(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!comment.author || comment.author.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    comment.isActive = false;
    await this.commentRepository.save(comment);
  }

  async vote(voteDto: VoteDto, userId: string): Promise<{ success: boolean; message: string }> {
    const { type, postId, commentId } = voteDto;

    if (!postId && !commentId) {
      throw new BadRequestException('Either postId or commentId must be provided');
    }

    if (postId && commentId) {
      throw new BadRequestException('Cannot vote on both post and comment simultaneously');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let existingVote: Vote | null;
    let target: Post | Comment;

    if (postId) {
      const post = await this.postRepository.findOne({ where: { id: postId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      target = post;
      existingVote = await this.voteRepository.findOne({
        where: { user: { id: userId }, post: { id: postId } },
      });
    } else {
      const comment = await this.commentRepository.findOne({ where: { id: commentId } });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
      target = comment;
      existingVote = await this.voteRepository.findOne({
        where: { user: { id: userId }, comment: { id: commentId } },
      });
    }

    if (existingVote) {
      if (existingVote.type === type) {
        await this.voteRepository.remove(existingVote);
        if (existingVote.type === 'up' || existingVote.type === 'down') {
          await this.updateVoteCount(target, existingVote.type, -1);
        }
        return { success: true, message: 'Vote removed' };
      } else {
        const oldType = existingVote.type;
        existingVote.type = type;
        await this.voteRepository.save(existingVote);
      if (oldType === 'up' || oldType === 'down') {
        await this.updateVoteCount(target, oldType, -1);
      }
      if (existingVote.type === 'up' || existingVote.type === 'down') {
        await this.updateVoteCount(target, existingVote.type, 1);
      }
      return { success: true, message: 'Vote updated' };
    }
  } else {
    const vote = this.voteRepository.create({
      type,
      user,
      ...(postId ? { post: target as Post } : { comment: target as Comment }),
    });
    await this.voteRepository.save(vote);
    if (type === 'up' || type === 'down') {
      await this.updateVoteCount(target, type, 1);
    }
    return { success: true, message: 'Vote added' };
  }
}

  private async updateVoteCount(target: Post | Comment, voteType: 'up' | 'down', increment: number): Promise<void> {
    const field = voteType === 'up' ? 'upvotes' : 'downvotes';
    const repository = target instanceof Post ? this.postRepository : this.commentRepository;
    await repository.increment({ id: target.id }, field, increment);
  }

  async searchPosts(searchDto: SearchDto): Promise<{ posts: Post[]; total: number }> {
    const { query, page = 1, limit = 20, category, tags } = searchDto;

    const queryBuilder = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.tags', 'tags')
      .where('post.isActive = :isActive', { isActive: true })
      .andWhere('(post.title ILIKE :query OR post.content ILIKE :query)', { query: `%${query}%` });

    if (category) {
      queryBuilder.andWhere('category.slug = :category', { category });
    }

    if (tags) {
      const tagNames = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('tags.name IN (:...tagNames)', { tagNames });
    }

    const total = await queryBuilder.getCount();
    const posts = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { posts, total };
  }

  async moderatePost(id: string, action: 'lock' | 'unlock' | 'pin' | 'unpin' | 'delete', moderatorNote?: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    switch (action) {
      case 'lock':
        post.isLocked = true;
        break;
      case 'unlock':
        post.isLocked = false;
        break;
      case 'pin':
        post.isPinned = true;
        break;
      case 'unpin':
        post.isPinned = false;
        break;
      case 'delete':
        post.isActive = false;
        break;
    }

    if (moderatorNote) {
      post.moderatorNote = moderatorNote;
    }

    return this.postRepository.save(post);
  }

  async moderateComment(id: string, action: 'delete', moderatorNote?: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (action === 'delete') {
      comment.isActive = false;
    }

    if (moderatorNote) {
      comment.moderatorNote = moderatorNote;
    }

    return this.commentRepository.save(comment);
  }

  async detectSpam(content: string): Promise<boolean> {
    const spamKeywords = ['spam', 'buy now', 'click here', 'free money', 'urgent', 'limited time'];
    const lowerContent = content.toLowerCase();
    
    const hasSpamKeywords = spamKeywords.some(keyword => lowerContent.includes(keyword));
    
   const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length;
    const excessiveCaps = capsPercentage > 0.5 && content.length > 10;
    
    const linkCount = (content.match(/https?:\/\//g) || []).length;
    const excessiveLinks = linkCount > 3;
    
    return hasSpamKeywords || excessiveCaps || excessiveLinks;
  }

  async createPostWithNotifications(createPostDto: CreatePostDto, userId: string): Promise<Post> {
  const post = await this.createPost(createPostDto, userId);
  
  this.NotificationGateway.sendForumUpdate('post', 'create', {
    id: post.id,
    title: post.title,
    author: post.author?.username,
    category: post.category?.name,
  });

  return post;
}

async createCommentWithNotifications(createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
  const comment = await this.createComment(createCommentDto, userId);
  
  const post = await this.postRepository.findOne({
    where: { id: createCommentDto.postId },
    relations: ['author'],
  });

  if (post && post.author?.id !== userId) {
    await this.NotificationService.createNotification(
      post.author?.id,
      userId,
      'post_reply',
      'New comment on your post',
      `Someone commented on your post "${post.title}"`,
      comment.id,
      'comment',
    );

    this.NotificationGateway.sendNotificationToUser(post.author?.id, {
      type: 'post_reply',
      message: `Someone commented on your post "${post.title}"`,
      entityId: comment.id,
    });
  }

  if (createCommentDto.parentId) {
    const parentComment = await this.commentRepository.findOne({
      where: { id: createCommentDto.parentId },
      relations: ['author'],
    });

    if (parentComment && parentComment.author?.id !== userId) {
      await this.NotificationService.createNotification(
        parentComment.author?.id,
        userId,
        'comment_reply',
        'Reply to your comment',
        `Someone replied to your comment`,
        comment.id,
        'comment',
      );

      this.NotificationGateway.sendNotificationToUser(parentComment.author?.id, {
        type: 'comment_reply',
        message: 'Someone replied to your comment',
        entityId: comment.id,
      });
    }
  }

  this.NotificationGateway.sendForumUpdate('comment', 'create', {
    id: comment.id,
    postId: createCommentDto.postId,
    author: comment.author?.username,
  });

  return comment;
}

async voteWithNotifications(voteDto: VoteDto, userId: string): Promise<{ success: boolean; message: string }> {
  const result = await this.vote(voteDto, userId);
  
  if (result.success && result.message === 'Vote added') {
    let targetAuthorId: string | undefined = undefined;
    let notificationType: string | undefined = undefined;
    let notificationMessage: string | undefined = undefined;
    let entityId: string | undefined = undefined;
    let entityType: string | undefined = undefined;

    if (voteDto.postId) {
      const post = await this.postRepository.findOne({
        where: { id: voteDto.postId },
        relations: ['author'],
      });
      if (post && post.author?.id !== userId) {
        targetAuthorId = post.author?.id;
        notificationType = 'post_vote';
        notificationMessage = `Someone ${voteDto.type}voted your post "${post.title}"`;
        entityId = post.id;
        entityType = 'post';
      }
    } else if (voteDto.commentId) {
      const comment = await this.commentRepository.findOne({
        where: { id: voteDto.commentId },
        relations: ['author'],
      });
      if (comment && comment.author?.id !== userId) {
        targetAuthorId = comment.author!.id;
        notificationType = 'comment_vote';
        notificationMessage = `Someone ${voteDto.type}voted your comment`;
        entityId = comment.id!;
        entityType = 'comment';
      }
    }

    if (targetAuthorId && notificationType && notificationMessage && entityId && entityType) {
      await this.NotificationService.createNotification(
        targetAuthorId,
        userId,
        notificationType,
        'Vote received',
        notificationMessage,
        entityId,
        entityType,
      );

      this.NotificationGateway.sendNotificationToUser(targetAuthorId, {
        type: notificationType,
        message: notificationMessage,
        entityId,
      });
    }
  }
  return result;
}

}
