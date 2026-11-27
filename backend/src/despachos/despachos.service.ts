import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AparienciaDto, CreateDespachoDto, CreateMiembroDto, UpdateDespachoDto } from './dto';
import { nombrePaleta } from './paletas';

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
      logo_url: despacho.logo_url,
      portada_url: despacho.portada_url,
      paleta: despacho.paleta || 'negro',
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
    this.aplicarApariencia(despacho, dto);
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

  async mio(user: AuthUser) {
    return this.present(await this.find(this.propio(user)));
  }

  async apariencia(user: AuthUser, dto: AparienciaDto) {
    const despacho = await this.find(this.propio(user));
    const antes = fichaDespacho(despacho);
    this.aplicarApariencia(despacho, dto);
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
        actor: user,
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

  private propio(user: AuthUser) {
    if (!user.despacho_id) throw new ForbiddenException('Esta cuenta no pertenece a un despacho.');
    return user.despacho_id;
  }

  private aplicarApariencia(despacho: Despacho, dto: AparienciaDto) {
    if (dto.logo_url !== undefined) despacho.logo_url = imagenDe(dto.logo_url);
    if (dto.portada_url !== undefined) despacho.portada_url = imagenDe(dto.portada_url);
    if (dto.paleta !== undefined) despacho.paleta = dto.paleta;
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
      logo_url: despacho.logo_url,
      portada_url: despacho.portada_url,
      paleta: despacho.paleta || 'negro',
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

function imagenDe(value?: string | null) {
  if (value == null || value.trim() === '') return null;
  const url = value.trim();
  if (!/^\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(url)) {
    throw new BadRequestException('Usa una imagen PNG, JPG o WebP.');
  }
  return url;
}

function fichaDespacho(despacho: Despacho) {
  return {
    Nombre: despacho.name,
    Teléfono: despacho.phone,
    Domicilio: despacho.address,
    Descripción: despacho.blurb,
    Logo: despacho.logo_url ? 'Sí' : 'No',
    Portada: despacho.portada_url ? 'Sí' : 'No',
    Colores: nombrePaleta(despacho.paleta),
    Activo: despacho.is_active ? 'Sí' : 'No',
  };
}
