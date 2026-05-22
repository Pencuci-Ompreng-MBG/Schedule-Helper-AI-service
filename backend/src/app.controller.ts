import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Mengecek status kesehatan (health check) dari API backend.
   * Biasanya dipanggil oleh sistem monitoring untuk memastikan server merespon.
   */
  @Get()
  health() {
    return { status: 'ok' };
  }
}
