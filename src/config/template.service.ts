import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateService {
  getTemplate(name: string, version: number) {
    return { handler: 'processData', config: { retries: 3 } };
  }
}