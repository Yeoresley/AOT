import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogsController],
  providers: [CatalogsService],
})
export class CatalogsModule {}
