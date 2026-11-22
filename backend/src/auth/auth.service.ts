import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { Despacho } from '../entities/despacho.entity';
import { User } from '../entities/user.entity';
import { GruposService } from '../grupos/grupos.service';
import { LoginDto } from './dto';

export type PermisoUsuario = {
  clave: string;
  insertar: boolean;
  actualizar: boolean;
  eliminar: boolean;
};

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  despacho_id: number | null;
  despacho_slug: string | null;
  permisos: PermisoUsuario[];
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    private readonly jwt: JwtService,
    private readonly grupos: GruposService,
  ) {}

  async login(dto: LoginDto) {
    const clave = dto.email.trim().toLowerCase();
    const user = clave.includes('@')
      ? await this.users.findOne({ where: { email: clave } })
      : await this.users.findOne({ where: { username: clave } });
    const matches = user ? await bcrypt.compare(dto.password, user.password) : false;
    if (!user || !matches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (user.activo === false) {
      throw new UnauthorizedException('Esta cuenta no puede iniciar sesión.');
    }
    if (user.despacho_id) {
      const despacho = await this.despachos.findOne({ where: { id: user.despacho_id } });
      if (!despacho?.is_active) throw new UnauthorizedException('El despacho está suspendido.');
    }
    const access_token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { access_token, user: await this.present(user) };
  }

  async me(id: number): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Tu sesión expiró. Vuelve a entrar.');
    return this.present(user);
  }

  private async present(user: User): Promise<PublicUser> {
    const despacho = user.despacho_id
      ? await this.despachos.findOne({ where: { id: user.despacho_id } })
      : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      despacho_id: user.despacho_id,
      despacho_slug: despacho?.slug ?? null,
      permisos: await this.grupos.permisosDe(user),
    };
  }
}
