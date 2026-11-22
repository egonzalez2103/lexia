import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
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

  async create(dto: CreateDespachoDto) {
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
    return this.present(despacho);
  }

  async update(id: number, dto: UpdateDespachoDto) {
    const despacho = await this.find(id);
    if (dto.name) despacho.name = dto.name.trim();
    if (dto.phone !== undefined) despacho.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) despacho.address = dto.address.trim() || null;
    if (dto.blurb !== undefined) despacho.blurb = dto.blurb.trim() || null;
    if (dto.is_active !== undefined) despacho.is_active = dto.is_active;
    await this.despachos.save(despacho);
    return this.present(despacho);
  }

  async addMember(id: number, dto: CreateMiembroDto) {
    await this.find(id);
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
