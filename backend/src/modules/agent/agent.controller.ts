/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable 
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access
*/

import {
  Controller,
  Get,
  Req,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AgentService } from './agent.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatDto } from './dto/chat.dto';
import axios from 'axios';
import { Readable } from 'stream';
import { RouterType } from './types/agent-output.type';
import { JwtGuard } from '../auth/guard/jwt.guard.js';
import { GetUser } from '../auth/decorator/get-user.decorator.js';

@ApiTags('agent')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Endpoint untuk mengirim pesan ke AI (LangGraph) dan menerima balasannya
   * secara real-time menggunakan mekanisme Server-Sent Events (SSE) / stream.
   */
  @Post('stream')
  async stream(
    @Body() body: ChatDto,
    @Res() res: Response,
    @Req() req: Request,
    @GetUser('id') userId: string,
  ) {
    try {
      const cookieHeader = req.headers.cookie;

      const cleanPayload: ChatDto = {
        message: body.message,
        approved_data: body?.approved_data,
        ...(body.thread_id?.trim() ? { thread_id: body.thread_id.trim() } : {}),
      };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.flushHeaders();

      const isResume = !!cleanPayload.thread_id;

      const fastApiResponse = await axios<Readable>({
        method: 'POST',
        url: isResume
          ? `${process.env.AI_API ?? 'http://localhost:8000'}/resume/${cleanPayload.thread_id}/stream`
          : `${process.env.AI_API ?? 'http://localhost:8000'}/chat/stream`,
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        data: isResume
          ? {
              user_id: userId,
              approved_data: body.approved_data,
            }
          : {
              user_id: userId,
              thread_id: cleanPayload.thread_id,
              message: cleanPayload.message,
            },
        responseType: 'stream',
      });

      let sessionThreadId = cleanPayload.thread_id;
      let status: string | undefined;
      let routerData: RouterType | undefined;
      let aiMessage: string | undefined;
      let buffer = '';

      fastApiResponse.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();

        const events = buffer.split('\n\n');

        buffer = events.pop() ?? '';

        for (const eventBlock of events) {
          try {
            const lines = eventBlock.split('\n');

            let eventType = '';
            let jsonStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              }

              if (line.startsWith('data:')) {
                jsonStr += line.replace('data:', '').trim();
              }
            }

            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);

            if (data?.thread_id) {
              sessionThreadId = data.thread_id;
            }

            if (eventType === 'agent_step' && data?.update?.node === 'router') {
              routerData = data.update.update;
            }

            if (eventType === 'execution_complete') {
              status = data.status;
              aiMessage =
                data?.hitl_payload?.draft || data?.hitl_payload?.message;
              console.log(`ai message: ${aiMessage}\n`);
            }
          } catch (error) {
            console.error('SSE parse error:', error);
          }
        }
      });
      let isDbSaved = false;

      // Buat helper function agar bisa dipanggil dari 'end' atau 'close'
      const saveToDatabase = async () => {
        if (isDbSaved || !sessionThreadId) return;
        isDbSaved = true; // Tandai agar tidak dipanggil 2 kali

        const payload: ChatDto = {
          ...cleanPayload,
          thread_id: sessionThreadId,
        };

        try {
          await this.agentService.upsertSession(
            payload,
            userId,
            status,
            routerData?.current_intent,
            aiMessage,
          );

          if (routerData?.raw_tasks?.length) {
            await this.agentService.upsertRawTask(userId, routerData.raw_tasks);
          }
        } catch (err) {
          console.error(
            '[Agent] Failed to save to NeonDB:',
            err instanceof Error ? err.message : String(err),
          );
        }
      };

      fastApiResponse.data.on('end', async () => {
        // 1. Tunggu Prisma selesai nge-save ke NeonDB
        await saveToDatabase();

        // 2. BARU matikan response. Vercel akan membekukan fungsi SETELAH baris ini.
        if (!res.writableEnded) {
          res.end();
        }
      });

      req.on('close', async () => {
        fastApiResponse.data.destroy();
        // Berjaga-jaga jika koneksi terputus di tengah jalan, tetap paksa save state terakhir
        await saveToDatabase();

        if (!res.writableEnded) {
          res.end();
        }
      });

      // Set { end: false } agar pipe tidak otomatis melakukan res.end()
      // Ini memaksa Vercel menunggu instruksi res.end() manual kita di dalam event 'end'
      fastApiResponse.data.pipe(res, { end: false });

      return res;
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: `Error connecting to AI server ${String(error)}`,
        });
      }
    }
  }

  /**
   * Endpoint untuk mengambil seluruh daftar riwayat percakapan (chat sessions)
   * milik user yang sedang login, diurutkan dari yang terbaru.
   */
  @Get()
  findAll(@GetUser('id') userId: string) {
    return this.agentService.findAll(userId);
  }

  /**
   * Endpoint untuk mengambil detail isi riwayat pesan (chat history)
   * dari satu percakapan/thread yang spesifik beserta status terakhir AI-nya.
   */
  @Get(':thread_id')
  async findThread(@Param('thread_id') threadId: string) {
    return this.agentService.findThread(threadId);
  }

  /**
   * Endpoint untuk menghapus riwayat percakapan beserta seluruh pesannya berdasarkan ID.
   */
  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.agentService.remove(id, userId);
  }
}
