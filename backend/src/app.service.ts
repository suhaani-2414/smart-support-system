import { Injectable } from '@nestjs/common';

/**
 * Service for the root controller. Tiny placeholder — exists so the
 * "hello world" handler has somewhere to live and serves as a template
 * for how every other service is wired into the DI system.
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}