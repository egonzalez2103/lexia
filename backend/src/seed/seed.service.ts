import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { User } from '../entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('OWNER_EMAIL', 'dueno@juridico.local').trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) return;
    const password = this.config.get<string>('OWNER_PASSWORD', 'DuenoJuridico2026');
    await this.users.save(
      this.users.create({
        name: this.config.get<string>('OWNER_NAME', 'Dueño'),
        email,
        password: await bcrypt.hash(password, 10),
        role: UserRole.DUENO,
        despacho_id: null,
      }),
    );
    this.logger.log(`Cuenta del dueño lista: ${email}`);
  }
}
