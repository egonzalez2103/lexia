import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../common/auth';

const folder = join(process.cwd(), 'uploads');
mkdirSync(folder, { recursive: true });

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: folder,
        filename: (_req, file, callback) => {
          const suffix = randomBytes(6).toString('hex');
          callback(null, `${Date.now()}-${suffix}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
          callback(new BadRequestException('Sube un PDF, Word o imagen.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo.');
    return { url: `/uploads/${file.filename}` };
  }
}
