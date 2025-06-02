import { Injectable } from '@nestjs/common';

@Injectable()
export class NotifierService {
  notify(message: string) {
    console.log('ALERT:', message); // integrate with email/slack
  }
}