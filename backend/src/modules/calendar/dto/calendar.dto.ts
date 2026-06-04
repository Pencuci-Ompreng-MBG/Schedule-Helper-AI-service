import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsArray,
  IsIn,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCalendarDto {
  @ApiProperty({ example: 'Meeting with Team' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Discuss project architecture' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'serius' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: '2026-05-10T10:00:00Z' })
  @IsDateString({ strict: false })
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({ example: '2026-05-06T09:00:00Z' })
  @IsDateString({ strict: false })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: ['Siapkan materi', 'Hadir meeting'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subtasks?: string[];
}

export class UpdateCalendarDto {
  @ApiPropertyOptional({ example: 'Updated Meeting Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional()
  @IsDateString({ strict: false })
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional()
  @IsDateString({ strict: false })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: ['Siapkan materi', 'Hadir meeting'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subtasks?: string[];
}

export class CalendarListQueryDto {
  @ApiPropertyOptional({ example: 'serius' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'completed', enum: ['all', 'completed', 'open'] })
  @IsString()
  @IsIn(['all', 'completed', 'open'])
  @IsOptional()
  completion?: 'all' | 'completed' | 'open';

  @ApiPropertyOptional({ example: 'meeting' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
