import { Injectable } from '@nestjs/common';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class AgentService {
  constructor(private readonly toolsService: ToolsService) {}
}
