import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { altaDe, diffCampos } from '../bitacora/cambios';
import { AuthUser } from '../common/auth';
import { UserRole } from '../common/enums';
import { normalizeSlug } from '../common/slug';
import { Despacho } from '../entities/despacho.entity';
import { User } from '../entities/user.entity';
import { CreateDespachoDto, CreateMiembroDto, UpdateDespachoDto } from './dto';

@Injectable()
export class DespachosService {
  constructor(
    @InjectRepository(Despacho) private readonly despachos: Repository<Despacho>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly bitacora: BitacoraService,
  ) {}

  async list() {
    const rows = await this.despachos.find({ order: { created_at: 'DESC' } });
    return Promise.all(rows.map((row) => this.present(row)));
  }

  async publicBySlug(slug: string) {
    const despacho = await this.despachos.findOne({ where: { slug: slug.toLowerCase(), is_active: true } });
    if (!despacho) throw new NotFoundException('No encontramos ese despacho.');
    return {
      id: despacho.id,
      name: despacho.name,
      slug: despacho.slug,
      phone: despacho.phone,
      address: despacho.address,
      blurb: despacho.blurb,
    };
  }

  async create(dto: CreateDespachoDto, actor: AuthUser) {
    const slug = normalizeSlug(dto.slug);
    if (!slug) throw new ConflictException('Ese enlace no se puede usar. Elige otro.');
    const taken = await this.despachos.findOne({ where: { slug } });
    if (taken) throw new ConflictException('Ese enlace ya pertenece a otro despacho.');
    const email = dto.admin_email.trim().toLowerCase();
    const emailTaken = await this.users.findOne({ where: { email } });
    if (emailTaken) throw new ConflictException('Ese correo ya tiene cuenta.');
    const despacho = await this.despachos.save(
      this.despachos.create({
        name: dto.name.trim(),
        slug,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        blurb: dto.blurb?.trim() || null,
        is_active: true,
      }),
    );
    await this.users.save(
      this.users.create({
        name: dto.admin_name.trim(),
        email,
        password: await bcrypt.hash(dto.admin_password, 10),
        role: UserRole.ADMIN_DESPACHO,
        despacho_id: despacho.id,
      }),
    );
    await this.bitacora.registrar({
      despachoId: null,
      entidad: 'Despacho',
      entidadId: despacho.id,
      referencia: despacho.name,
      tipo: 'alta',
      campos: altaDe({
        Nombre: despacho.name,
        Enlace: despacho.slug,
        Teléfono: despacho.phone,
        Domicilio: despacho.address,
        Descripción: despacho.blurb,
        Administrador: dto.admin_name.trim(),
        'Correo del administrador': email,
      }),
      actor,
    });
    return this.present(despacho);
  }

  async update(id: number, dto: UpdateDespachoDto, actor: AuthUser) {
    const despacho = await this.find(id);
    const antes = fichaDespacho(despacho);
    if (dto.name) despacho.name = dto.name.trim();
    if (dto.phone !== undefined) despacho.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) despacho.address = dto.address.trim() || null;
    if (dto.blurb !== undefined) despacho.blurb = dto.blurb.trim() || null;
    if (dto.is_active !== undefined) despacho.is_active = dto.is_active;
    await this.despachos.save(despacho);
    const campos = diffCampos(antes, fichaDespacho(despacho));
    if (campos) {
      await this.bitacora.registrar({
        despachoId: despacho.id,
        entidad: 'Despacho',
        entidadId: despacho.id,
        referencia: despacho.name,
        tipo: 'edicion',
        campos,
        actor,
      });
    }
    return this.present(despacho);
  }

  async addMember(id: number, dto: CreateMiembroDto, actor: AuthUser) {
    const despacho = await this.find(id);
    const email = dto.email.trim().toLowerCase();
    const emailTaken = await this.users.findOne({ where: { email } });
    if (emailTaken) throw new ConflictException('Ese correo ya tiene cuenta.');
    const user = await this.users.save(
      this.users.create({
        name: dto.name.trim(),
        email,
        password: await bcrypt.hash(dto.password, 10),
        role: UserRole.MIEMBRO_DESPACHO,
        despacho_id: id,
      }),
    );
    await this.bitacora.registrar({
      despachoId: id,
      entidad: 'Usuario',
      entidadId: user.id,
      referencia: user.name,
      tipo: 'alta',
      campos: altaDe({ Nombre: user.name, Correo: user.email, Despacho: despacho.name }),
      actor,
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private async find(id: number) {
    const despacho = await this.despachos.findOne({ where: { id } });
    if (!despacho) throw new NotFoundException('No encontramos ese despacho.');
    return despacho;
  }

  private async present(despacho: Despacho) {
    const users = await this.users.find({
      where: { despacho_id: despacho.id },
      order: { created_at: 'ASC' },
    });
    return {
      id: despacho.id,
      name: despacho.name,
      slug: despacho.slug,
      phone: despacho.phone,
      address: despacho.address,
      blurb: despacho.blurb,
      is_active: despacho.is_active,
      created_at: despacho.created_at,
      sitio: `/sitio/${despacho.slug}`,
      usuarios: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
    };
  }
}

function fichaDespacho(despacho: Despacho) {
  return {
    Nombre: despacho.name,
    Teléfono: despacho.phone,
    Domicilio: despacho.address,
    Descripción: despacho.blurb,
    Activo: despacho.is_active ? 'Sí' : 'No',
  };
}
