import { Module, Global } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';
import { McpStdioClientService } from './mcp-stdio-client.service';
import { ToolCallbackProvider } from './tool-callback-provider';
import { ToolsModule } from '../tools/tools.module';

@Global()
@Module({
  imports: [ToolsModule],
  providers: [McpClientService, McpStdioClientService, ToolCallbackProvider],
  exports: [McpClientService, McpStdioClientService, ToolCallbackProvider],
})
export class McpModule {}
