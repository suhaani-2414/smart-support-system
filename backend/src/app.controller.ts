import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root controller. Mounted at the API prefix, so GET /api/v1 lands here.
 *
 * Kept around as a simple liveness/sanity endpoint — useful for "is the
 * service up?" probes and for Render's health check.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}