import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from '../app.service';
import { AgentService } from '../agent/agent.service';
import { Observable } from 'rxjs';

@Controller('ai')
export class AiController {
  constructor(
    private readonly appService: AppService,
    private readonly agentService: AgentService,
  ) {}

  @Get('code-app/chat/sync')
  async doChatWithCodeAppSync(
    @Query('message') message: string,
    @Query('chatId') chatId: string,
  ): Observable<MessageEvent> {}
}
