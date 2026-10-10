import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(eventType: string, aggregateType: string, aggregateId: string, payload: object) {
    return this.prisma.domainEventOutbox.create({
      data: {
        eventType,
        aggregateType,
        aggregateId,
        payload,
      },
    });
  }
}
