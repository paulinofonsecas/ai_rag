import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller('chat')
export class ChatController {
    @Post('session')
    createSession(@Body() body: any) {
        // TODO: Implement session creation
        return { sessionId: 'mock-session-id' };
    }

    @Post('message/:sessionId')
    sendMessage(@Param('sessionId') sessionId: string, @Body() body: any) {
        // TODO: Implement message handling
        return { reply: 'mock-reply', sessionId };
    }

    @Get('session/:sessionId')
    getSession(@Param('sessionId') sessionId: string) {
        // TODO: Implement session retrieval
        return { sessionId, messages: [] };
    }
}
