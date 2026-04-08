import { Global, Module } from '@nestjs/common';
import { PlatformEventsService } from './platform-events.service';

@Global()
@Module({
  providers: [PlatformEventsService],
  exports: [PlatformEventsService],
})
export class PlatformEventsModule {}
