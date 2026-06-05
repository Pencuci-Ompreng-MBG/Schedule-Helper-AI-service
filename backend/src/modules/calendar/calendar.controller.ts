import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service.js';
import {
  CalendarListQueryDto,
  CreateCalendarDto,
  UpdateCalendarDto,
} from './dto/calendar.dto.js';
import { JwtGuard } from '../auth/guard/jwt.guard.js';
import { GetUser } from '../auth/decorator/get-user.decorator.js';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Endpoint untuk menarik dan mensinkronisasikan seluruh jadwal (Google Calendar & DB)
   * milik user yang sedang login.
   */
  @Get()
  @ApiOperation({
    summary: 'Pull calendar schedules for the current user',
  })
  @ApiResponse({ status: 200, description: 'Return all schedules' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'completion',
    required: false,
    description: 'Filter by completion state',
    enum: ['all', 'completed', 'open'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by title, description, category, or raw input',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size' })
  findAll(@GetUser('id') userId: string, @Query() query: CalendarListQueryDto) {
    return this.calendarService.findAll(userId, query);
  }

  /**
   * Endpoint ringan untuk mengambil daftar kategori unik yang tersedia.
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get available task categories' })
  @ApiResponse({ status: 200, description: 'Return category list' })
  getCategories(@GetUser('id') userId: string) {
    return this.calendarService.getCategories(userId);
  }

  /**
   * Endpoint untuk sinkronisasi manual ke Google Calendar / Google Tasks.
   */
  @Post('sync')
  @ApiOperation({ summary: 'Sync calendar schedules with Google services' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category after sync',
  })
  @ApiQuery({
    name: 'completion',
    required: false,
    description: 'Filter by completion state after sync',
    enum: ['all', 'completed', 'open'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search by title, description, category, or raw input after sync',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number after sync',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size after sync',
  })
  sync(@GetUser('id') userId: string, @Query() query: CalendarListQueryDto) {
    return this.calendarService.syncAndFindAll(userId, query);
  }

  /**
   * Endpoint untuk mengecek apakah user sudah mengizinkan akses ke Google Calendar dan Google Tasks.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Check if Google Calendar and Tasks are ready' })
  @ApiResponse({ status: 200, description: 'Return readiness status' })
  checkReady(@GetUser('id') userId: string) {
    return this.calendarService.getReadinessStatus(userId);
  }

  /**
   * Endpoint untuk mengambil detail satu jadwal spesifik berdasarkan ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific schedule by ID' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.calendarService.findOne(id, userId);
  }

  /**
   * Endpoint untuk membuat jadwal baru secara manual.
   * Ini juga akan membuat event di Google Calendar dan task di Google Tasks secara otomatis.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new manual schedule' })
  create(
    @GetUser('id') userId: string,
    @Body() createCalendarDto: CreateCalendarDto,
  ) {
    return this.calendarService.create(userId, createCalendarDto);
  }

  /**
   * Endpoint untuk mengupdate data jadwal yang sudah ada.
   * Perubahan akan otomatis disinkronisasikan ke Google Calendar.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing schedule' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
  ) {
    return this.calendarService.update(id, userId, updateCalendarDto);
  }

  /**
   * Endpoint untuk menghapus jadwal.
   * Ini juga akan menghapus event terkait di Google Calendar dan Google Tasks.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.calendarService.remove(id, userId);
  }
}
