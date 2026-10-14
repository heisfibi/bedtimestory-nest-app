import { Global, Module } from '@nestjs/common';
import { AppIntegrityController } from './app-integrity.controller.js';
import { AppIntegrityGuard } from './app-integrity.guard.js';
import { AppIntegrityService } from './app-integrity.service.js';

// Global, so that any controller can put AppIntegrityGuard on the app's endpoints.
@Global()
@Module({
  controllers: [AppIntegrityController],
  providers: [AppIntegrityService, AppIntegrityGuard],
  exports: [AppIntegrityService, AppIntegrityGuard],
})
export class AppIntegrityModule {}
