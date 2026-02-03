import { Injectable } from '@nestjs/common';

@Injectable()
export class AgentService {
  constructor(private readonly toolsService: ToolsService) {}
}
