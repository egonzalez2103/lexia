import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { Despacho } from '../entities/despacho.entity';
import { User } from '../entities/user.entity';

type JwtPayload = {
  sub: number;
  email: string;
  role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.activo === false) throw new UnauthorizedException('Tu sesión expiró. Vuelve a entrar.');
    if (user.despacho_id) {
      const despacho = await this.despachos.findOne({ where: { id: user.despacho_id } });
      if (!despacho?.is_active) throw new UnauthorizedException('El despacho está suspendido.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      despacho_id: user.despacho_id,
      grupo_id: user.grupo_id,
    };
  }
}
