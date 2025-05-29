import { PartialType } from '@nestjs/mapped-types';
import { CreateDataIngestionDto } from './create-data-ingestion.dto';

export class UpdateDataIngestionDto extends PartialType(CreateDataIngestionDto) {}
