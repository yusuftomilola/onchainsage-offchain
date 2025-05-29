import { PartialType } from '@nestjs/mapped-types';
import { CreateAiProcessingDto } from './create-ai-processing.dto';

export class UpdateAiProcessingDto extends PartialType(CreateAiProcessingDto) {}
