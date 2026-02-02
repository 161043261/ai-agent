import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdvisorModule } from './advisor/advisor.module';

@Module({
  imports: [AdvisorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
