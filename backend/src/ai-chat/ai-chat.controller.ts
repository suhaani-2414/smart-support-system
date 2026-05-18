import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AiChatService } from './ai-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Role } from '../users/enums/role.enum';

type AuthenticatedRequest = {
  user: {
    sub: number;
    role: Role;
  };
};

/**
 * AI support chat is available to every authenticated role — USER, AGENT
 * and ADMIN — so only JwtAuthGuard is applied here. Role-specific
 * BEHAVIOUR is driven by the system prompt inside AiChatService.
 */
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('sessions')
  list(@Request() req: AuthenticatedRequest) {
    return this.aiChatService.listSessions(req.user.sub);
  }

  @Post('sessions')
  create(@Request() req: AuthenticatedRequest) {
    return this.aiChatService.createSession(req.user.sub);
  }

  @Get('sessions/:id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.aiChatService.getSession(id, req.user.sub);
  }

  @Post('sessions/:id/messages')
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.aiChatService.sendMessage(id, req.user.sub, dto.content);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.aiChatService.deleteSession(id, req.user.sub);
  }
}
