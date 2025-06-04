import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TwitterModule } from '../twitter/twitter.module';
import { TwitterJob } from './twitter.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TwitterModule,
  ],
  providers: [TwitterJob],
})
export class JobModule {}
